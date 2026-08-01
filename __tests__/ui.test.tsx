import { render } from '@testing-library/react-native';

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
