import { seededIngredients } from '@/src/data/ingredients';
import { generateRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';

describe('guided recipe engine', () => {
  it('blocks recipes that exceed the selected machine fill target', () => {
    const validation = validateRecipe([{ ingredientId: 'milk-2', amount: 700, unit: 'ml' }], seededIngredients, 'classic');
    expect(validation.errors.join(' ')).toContain('safe fill target');
  });

  it('warns when a light base has no stabilizer', () => {
    const validation = validateRecipe([{ ingredientId: 'skim-milk', amount: 300, unit: 'ml' }, { ingredientId: 'allulose', amount: 15, unit: 'g' }], seededIngredients, 'nc501');
    expect(validation.errors).toHaveLength(0);
    expect(validation.warnings.join(' ')).toContain('stabilizer');
  });

  it('uses CreamiFit when a compatible machine receives a protein-forward recipe', () => {
    const recipe = generateRecipe({
      name: 'Protein Test', style: 'lite-ice-cream', ingredients: seededIngredients,
      items: [{ ingredientId: 'skim-milk', amount: 300, unit: 'ml' }, { ingredientId: 'whey-vanilla', amount: 30, unit: 'g' }, { ingredientId: 'casein-vanilla', amount: 20, unit: 'g' }],
    });
    expect(recommendProgram(recipe, 'nc601').program.id).toBe('creamifit');
  });

  it('falls back to a program available on older machines', () => {
    const recipe = generateRecipe({
      name: 'Protein Test', style: 'lite-ice-cream', ingredients: seededIngredients,
      items: [{ ingredientId: 'skim-milk', amount: 300, unit: 'ml' }, { ingredientId: 'whey-vanilla', amount: 30, unit: 'g' }],
    });
    expect(recommendProgram(recipe, 'breeze').program.id).toBe('lite-ice-cream');
  });
});
