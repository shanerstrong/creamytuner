import { displayAmount, calculateNutrition, displayUnitOptions, editableAmount, estimateVolumeMl, parseDisplayAmount } from '@/src/domain/nutrition';
import type { Ingredient } from '@/src/types';

const ingredient: Ingredient = {
  id: 'test-protein', name: 'Test Protein', subtitle: '', category: 'protein', defaultUnit: 'g', defaultAmount: 30, referenceAmount: 30,
  nutrition: { calories: 120, protein: 24, carbs: 3, sugar: 2, fat: 2, fiber: 1 }, isCustom: false,
};

describe('nutrition engine', () => {
  it('scales label values by the recipe amount', () => {
    expect(calculateNutrition([{ ingredientId: ingredient.id, amount: 15, unit: 'g' }], [ingredient])).toEqual({
      calories: 60, protein: 12, carbs: 1.5, sugar: 1, fat: 1, fiber: 0.5,
    });
  });

  it('ignores deleted or unknown ingredients without producing NaN', () => {
    expect(calculateNutrition([{ ingredientId: 'missing', amount: 20, unit: 'g' }], [])).toEqual({ calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 });
  });

  it('estimates volume from canonical units', () => {
    expect(estimateVolumeMl([{ ingredientId: 'a', amount: 300, unit: 'ml' }, { ingredientId: 'b', amount: 10, unit: 'g' }, { ingredientId: 'c', amount: 1, unit: 'tsp' }])).toBe(314);
  });

  it('converts metric values for US display', () => {
    expect(displayAmount(300, 'ml', 'us')).toBe('10.1 fl oz');
    expect(displayAmount(28.3495, 'g', 'us')).toBe('1 oz');
    expect(displayAmount(15, 'g', 'metric')).toBe('15 g');
  });

  it('formats kitchen-friendly measurements as common fractions', () => {
    expect(displayAmount(120, 'ml', 'us', 'kitchen')).toBe('½ cup');
    expect(displayAmount(7.5, 'ml', 'us', 'kitchen')).toBe('1 ½ tsp');
    expect(displayAmount(0.25, 'tsp', 'us', 'kitchen')).toBe('¼ tsp');
  });

  it('supports direct kitchen unit editing without changing canonical ingredient units', () => {
    expect(displayUnitOptions('ml', 'us', 'kitchen')).toContain('tbsp');
    expect(editableAmount(300, 'ml', 'cup')).toBeCloseTo(1.25);
    expect(parseDisplayAmount(2, 'tbsp', 'tsp')).toEqual({ amount: 6, unit: 'tsp' });
  });
});
