import { calculateNutrition, displayAmount, displayAmountStep, displayUnitOptions, editableAmount, estimateVolumeMl, formatKitchenVolume, parseDisplayAmount } from '@/src/domain/nutrition';
import type { Ingredient } from '@/src/types';

const ingredient: Ingredient = { id: 'test-protein', name: 'Test Protein', subtitle: '', category: 'protein', defaultUnit: 'g', defaultAmount: 30, referenceAmount: 30, nutrition: { calories: 120, protein: 24, carbs: 3, sugar: 2, fat: 2, fiber: 1 }, isCustom: false };

describe('nutrition engine', () => {
  it('scales label values by the recipe amount', () => {
    expect(calculateNutrition([{ ingredientId: ingredient.id, amount: 15, unit: 'g' }], [ingredient])).toEqual({ calories: 60, protein: 12, carbs: 1.5, sugar: 1, addedSugar: 0, fat: 1, fiber: 0.5 });
  });
  it('ignores deleted ingredients without producing NaN', () => {
    expect(calculateNutrition([{ ingredientId: 'missing', amount: 20, unit: 'g' }], [])).toEqual({ calories: 0, protein: 0, carbs: 0, sugar: 0, addedSugar: 0, fat: 0, fiber: 0 });
  });
  it('estimates volume from canonical units', () => {
    expect(estimateVolumeMl([{ ingredientId: 'a', amount: 300, unit: 'ml' }, { ingredientId: 'b', amount: 10, unit: 'g' }, { ingredientId: 'c', amount: 1, unit: 'tsp' }])).toBe(314);
  });
  it('converts exact metric values for US display', () => {
    expect(displayAmount(300, 'ml', 'us')).toBe('10.1 fl oz');
    expect(displayAmount(28.3495, 'g', 'us')).toBe('1 oz');
    expect(displayAmount(15, 'g', 'metric')).toBe('15 g');
  });
  it.each([
    [60, '¼ cup'], [80, '⅓ cup'], [100, '⅓ cup + 1 tbsp + 1 tsp'], [120, '½ cup'], [240, '1 cup'], [300, '1 ¼ cups'],
  ])('formats %i ml as %s', (ml, expected) => expect(formatKitchenVolume(ml)).toBe(expected));
  it('rounds the smallest spoon remainder to a quarter teaspoon', () => {
    expect(formatKitchenVolume(7.5)).toBe('1 ½ tsp');
    expect(displayAmount(0.25, 'tsp', 'us', 'kitchen')).toBe('¼ tsp');
  });
  it('supports direct unit editing while preserving canonical units', () => {
    expect(displayUnitOptions('ml', 'us', 'kitchen')).toContain('tbsp');
    expect(editableAmount(300, 'ml', 'cup')).toBeCloseTo(1.25);
    expect(parseDisplayAmount(2, 'tbsp', 'tsp')).toEqual({ amount: 6, unit: 'tsp' });
    expect(parseDisplayAmount(editableAmount(300, 'ml', 'cup'), 'cup').amount).toBeCloseTo(300);
  });
  it('uses practical increments for amount stepper controls', () => {
    expect(displayAmountStep('cup')).toBe(0.25);
    expect(displayAmountStep('tbsp')).toBe(0.5);
    expect(displayAmountStep('tsp')).toBe(0.5);
    expect(displayAmountStep('fl-oz')).toBe(0.5);
    expect(displayAmountStep('ml')).toBe(10);
    expect(displayAmountStep('g')).toBe(5);
    expect(displayAmountStep('tbsp', true)).toBe(0.25);
    expect(displayAmountStep('oz', true)).toBe(0.1);
  });
});
