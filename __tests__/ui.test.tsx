import { render } from '@testing-library/react-native';

import { BuilderQuestionStep, CompactProgress } from '@/src/components/builder/simple-steps';
import { NutritionFactsPanel, NutritionSummary } from '@/src/components/nutrition';

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

describe('recommend-first builder', () => {
  const answers = { texture: 'creamy' as const, flavor: 'strawberry' as const, goal: 'high-protein' as const };

  it('shows one compact question at a time', async () => {
    const screen = await render(<BuilderQuestionStep stage="question-texture" answers={answers} onChange={jest.fn()} />);
    expect(screen.getByText('What texture sounds good?')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Creamy and scoopable. A familiar ice-cream texture.' })).toBeTruthy();
    expect(screen.queryByText('Choose a flavor')).toBeNull();
    expect(screen.queryByText('What is your main goal?')).toBeNull();
  });

  it('uses a three-question progress indicator', async () => {
    const screen = await render(<CompactProgress stage="question-flavor" />);
    expect(screen.getByText('Question 2 of 3')).toBeTruthy();
  });

  it('clearly marks the default recommendation', async () => {
    const screen = await render(<BuilderQuestionStep stage="question-goal" answers={answers} onChange={jest.fn()} />);
    expect(screen.getByText('RECOMMENDED')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'High protein. Prioritize protein and creamy body.' })).toBeTruthy();
  });
});
