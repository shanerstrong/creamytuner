import { render } from '@testing-library/react-native';

import { NutritionFactsPanel, NutritionSummary } from '@/src/components/nutrition';
import { GuidedGoalStep, StartingPointStep, TutorialIntroStep } from '@/src/components/builder/tutorial-steps';

const nutrition = { calories: 325, protein: 30, carbs: 20, sugar: 12, fat: 8, fiber: 2 };

describe('nutrition presentation', () => {
  it('keeps percent daily value out of the summary', async () => {
    const screen = await render(<NutritionSummary nutrition={nutrition} />);
    expect(screen.getByText('325')).toBeTruthy();
    expect(screen.getByText('30 g')).toBeTruthy();
    expect(screen.queryByText(/Daily Value|%/)).toBeNull();
  });
  it('shows daily values only in the expanded panel', async () => {
    const screen = await render(<NutritionFactsPanel nutrition={nutrition} />);
    expect(screen.getByText('% Daily Value*')).toBeTruthy();
    expect(screen.getByText('Dietary Fiber')).toBeTruthy();
    expect(screen.getByText('Total Sugars')).toBeTruthy();
  });
});

describe('guided builder tutorial', () => {
  it('introduces the process before asking for detailed amounts', async () => {
    const screen = await render(<TutorialIntroStep />);
    expect(screen.getByText('Let’s build one together')).toBeTruthy();
    expect(screen.getByText('Pick a goal')).toBeTruthy();
    expect(screen.getByText('Freeze and spin')).toBeTruthy();
  });
  it('offers a recommended guided start and a reusable template', async () => {
    const screen = await render(<StartingPointStep hasTemplate={false} onGuided={jest.fn()} onTemplate={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Help me build a balanced base' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start with the Ultra-Thick Base template' })).toBeTruthy();
  });
  it('keeps the goal page focused on one decision', async () => {
    const screen = await render(<GuidedGoalStep preferences={{ style: 'ice-cream', flavor: 'anything', craving: '' }} onPreferencesChange={jest.fn()} />);
    expect(screen.getByText('Why this matters')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Ice cream: Rich and scoopable' })).toBeTruthy();
    expect(screen.queryByText('Make it yours')).toBeNull();
  });
});
