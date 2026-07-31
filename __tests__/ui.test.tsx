import { render } from '@testing-library/react-native';

import { NutritionStrip } from '@/src/components/ui';

describe('NutritionStrip', () => {
  it('renders the core recipe metrics', async () => {
    const screen = await render(<NutritionStrip nutrition={{ calories: 325, protein: 30, carbs: 20, sugar: 12, fat: 8, fiber: 2 }} />);
    expect(screen.getByText('325')).toBeTruthy();
    expect(screen.getByText('30g')).toBeTruthy();
    expect(screen.getByText('12g')).toBeTruthy();
    expect(screen.getByText('8g')).toBeTruthy();
  });
});
