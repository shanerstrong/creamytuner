import { render } from '@testing-library/react-native';

import { PintFillMeter } from '@/src/components/pint-fill-meter';
import { getPintFillState } from '@/src/domain/fill';
import { createFreezeTimer, formatFreezeTimerRemaining, FREEZE_DURATION_MS, getFreezeTimerRemainingMs, isFreezeTimerReady } from '@/src/domain/freeze-timer';
import { userSettingsSchema } from '@/src/types';

describe('live pint fill guide', () => {
  it('uses the same 92 percent safe-fill boundary as recipe validation', () => {
    expect(getPintFillState(435, 473).status).toBe('near-limit');
    expect(getPintFillState(436, 473).status).toBe('overflow');
    expect(getPintFillState(652, 709).status).toBe('near-limit');
    expect(getPintFillState(653, 709).status).toBe('overflow');
  });

  it('clamps the liquid rendering while retaining the real overflow percentage', () => {
    const fill = getPintFillState(900, 709);
    expect(fill.visualPercent).toBe(100);
    expect(fill.percent).toBe(127);
    expect(fill.overflowPercent).toBeGreaterThan(0);
    expect(getPintFillState(Number.NaN, 0).percent).toBe(0);
  });

  it('renders readable fill status and tutorial help', async () => {
    const screen = await render(<PintFillMeter estimatedVolumeMl={653} capacityMl={709} tutorialMode />);
    expect(screen.getByText('OVERFLOW')).toBeTruthy();
    expect(screen.getByText('TUTORIAL MODE')).toBeTruthy();
    expect(screen.getByLabelText(/653 milliliters of 709/i)).toBeTruthy();
  });
});

describe('freeze timer', () => {
  const recipe = { id: 'recipe-test', name: 'Strawberry Test Pint' };
  const start = Date.UTC(2026, 7, 2, 12, 0, 0);

  it('starts only when explicitly created and ends after an absolute 24 hours', () => {
    const timer = createFreezeTimer(recipe, start);
    expect(Date.parse(timer.endsAt) - Date.parse(timer.startedAt)).toBe(FREEZE_DURATION_MS);
    expect(getFreezeTimerRemainingMs(timer, start + 12 * 60 * 60 * 1000)).toBe(12 * 60 * 60 * 1000);
    expect(isFreezeTimerReady(timer, start + FREEZE_DURATION_MS - 1)).toBe(false);
    expect(isFreezeTimerReady(timer, start + FREEZE_DURATION_MS)).toBe(true);
    expect(formatFreezeTimerRemaining(timer, start)).toBe('24h 00m remaining');
  });

  it('persists through settings without changing older saved settings', () => {
    const emptySettings = userSettingsSchema.parse({});
    expect(emptySettings.activeFreezeTimer).toBeNull();
    const timer = createFreezeTimer(recipe, start);
    expect(userSettingsSchema.parse({ activeFreezeTimer: timer }).activeFreezeTimer).toEqual(timer);
  });
});
