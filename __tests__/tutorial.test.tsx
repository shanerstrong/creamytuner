import { fireEvent, render } from '@testing-library/react-native';

import { MiniPintOverlay } from '@/src/components/tutorial/mini-pint-overlay';
import { seededIngredients } from '@/src/data/ingredients';
import { machineById } from '@/src/data/machines';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, clampCreamyPosition, fitTutorialBaseAmount, tutorialItems, tutorialMixInItem, tutorialRecipePresentation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { tutorialDraftSchema, userSettingsSchema } from '@/src/types';

describe('first-pint tutorial', () => {
  test('existing settings default into the new welcome and tutorial', () => {
    const settings = userSettingsSchema.parse({ onboarded: true });
    expect(settings.onboardingVersion).toBeLessThan(CURRENT_ONBOARDING_VERSION);
    expect(settings.tutorialDraft.step).toBe(0);
    expect(settings.tutorialPintVisible).toBe(true);
    expect(settings.creamyHelperEnabled).toBe(true);
  });

  test('Creamy starts empty, then selected ingredients fill him while mix-ins stay post-spin', () => {
    expect(tutorialItems(tutorialDraftSchema.parse({}), seededIngredients)).toEqual([]);
    const draft = tutorialDraftSchema.parse({ baseAdded: true, proteinId: 'whey-vanilla', helperId: 'jello-vanilla-zero', sweetenerId: 'allulose', flavorId: 'strawberries', mixInId: 'cookie-pieces' });
    const baseItems = tutorialItems(draft, seededIngredients);
    expect(baseItems.map((item) => item.ingredientId)).toEqual(expect.arrayContaining(['milk-2', 'whey-vanilla', 'jello-vanilla-zero', 'allulose', 'strawberries']));
    expect(baseItems.some((item) => item.ingredientId === 'cookie-pieces')).toBe(false);
    expect(tutorialMixInItem(draft, seededIngredients)?.ingredientId).toBe('cookie-pieces');
  });

  test('Fit this container reduces the base below the conservative target', () => {
    const draft = tutorialDraftSchema.parse({ machineId: 'classic', baseAdded: true, proteinId: 'whey-vanilla', helperId: 'jello-vanilla-zero', sweetenerId: 'allulose', flavorId: 'strawberries' });
    const capacity = machineById('classic').capacityMl;
    const fitted = { ...draft, baseAmountMl: fitTutorialBaseAmount(draft, seededIngredients, capacity) };
    expect(estimateVolumeMl(tutorialItems(fitted, seededIngredients))).toBeLessThanOrEqual(Math.floor(capacity * 0.88));
  });

  test('tutorial copy routes each result to a clear next action', () => {
    expect(tutorialTextureGuidance.powdery.next).toBe('Re-Spin');
    expect(tutorialTextureGuidance.powdery.detail).toContain('before adding liquid');
    expect(tutorialTextureGuidance.chalky.detail).toContain('spoon or silicone spatula');
    expect(tutorialTextureGuidance['too-soft'].next).toBe('Back to freezer');
    expect(tutorialRecipePresentation(tutorialDraftSchema.parse({ flavorId: 'cocoa' })).imageKey).toBe('chocolate');
  });

  test('mini pint announces overflow and can be hidden', async () => {
    const onToggle = jest.fn();
    const screen = await render(<MiniPintOverlay amountMl={500} capacityMl={473} visible position={{ x: 0, y: 0 }} onPositionChange={jest.fn()} onToggle={onToggle} />);
    expect(screen.getByLabelText(/Creamy, live pint helper.*Over the MAX line.*Scared/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Hide Creamy helper' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('Creamy stays inside the tutorial viewport when dragged', () => {
    expect(clampCreamyPosition({ x: -999, y: -999 }, 390, 844)).toEqual({ x: -242, y: -544 });
    expect(clampCreamyPosition({ x: 90, y: 90 }, 390, 844)).toEqual({ x: 0, y: 48 });
  });
});
