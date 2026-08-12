import { parseNutritionLabel } from '@/src/domain/nutrition-label';

describe('nutrition label parsing', () => {
  test('extracts common US Nutrition Facts values and allergens', () => {
    const result = parseNutritionLabel('ACME\nVanilla Protein Shake', `
      Nutrition Facts
      Serving size 1 bottle (340 ml)
      Calories 190
      Total Fat 4.5g
      Total Carbohydrate 12g
      Dietary Fiber 3g
      Total Sugars 7g
      Includes 2g Added Sugars
      Protein 30g
      Contains: Milk, Soy.
      May contain: Peanuts.
    `);

    expect(result.name).toBe('ACME Vanilla Protein Shake');
    expect(result.referenceAmount).toBe(340);
    expect(result.unit).toBe('ml');
    expect(result.calories).toBe(190);
    expect(result.fat).toBe(4.5);
    expect(result.carbs).toBe(12);
    expect(result.fiber).toBe(3);
    expect(result.sugar).toBe(7);
    expect(result.addedSugar).toBe(2);
    expect(result.protein).toBe(30);
    expect(result.allergens).toEqual(['milk', 'soy']);
    expect(result.mayContainAllergens).toEqual(['peanuts']);
  });

  test('returns review warnings instead of inventing missing values', () => {
    const result = parseNutritionLabel('', 'Nutrition Facts\nTotal Fat 0g');
    expect(result.name).toBeUndefined();
    expect(result.calories).toBeUndefined();
    expect(result.warnings).toContain('Check the product name.');
    expect(result.warnings).toContain('Check calories; they were not read confidently.');
  });
});
