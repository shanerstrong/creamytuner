import { seededIngredients } from '@/src/data/ingredients';
import { generateRecipe, getPantrySubstitutionProposals, getRecipeFixOptions, recommendBeginnerRecipe, recommendGuidedRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import type { BeginnerFlavor, RecipeGoal, TexturePreference } from '@/src/types';

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

  it('recommends a pantry-aware thick base and substitutes soy milk when available', () => {
    const recommendation = recommendGuidedRecipe({
      preferences: { style: 'ice-cream', flavor: 'anything', craving: 'thick and creamy' },
      availableIngredientIds: ['soy-milk', 'whey-vanilla', 'cottage-cheese-low-fat', 'cream-cheese', 'xanthan-gum'],
      ingredients: seededIngredients,
      machineId: 'nc501',
    });
    expect(recommendation.suggestedItems.find((item) => item.ingredientId === 'soy-milk')).toBeTruthy();
    expect(recommendation.rationale).toContain('soy milk');
    expect(recommendation.missing.map((item) => item.id)).toContain('milk-2');
  });

  it('offers multiple sweetener choices instead of forcing one', () => {
    const recommendation = recommendGuidedRecipe({
      preferences: { style: 'ice-cream', flavor: 'anything', craving: '' },
      availableIngredientIds: [], ingredients: seededIngredients, machineId: 'nc501',
    });
    expect(recommendation.optional.map((item) => item.id)).toEqual(expect.arrayContaining(['allulose', 'sugar', 'brown-sugar']));
  });

  it('offers explicit warning fixes without mutating the current recipe', () => {
    const items = [{ ingredientId: 'skim-milk', amount: 300, unit: 'ml' as const }];
    const validation = validateRecipe(items, seededIngredients, 'nc501');
    const fixes = getRecipeFixOptions(items, seededIngredients, 'nc501', validation);
    expect(items).toEqual([{ ingredientId: 'skim-milk', amount: 300, unit: 'ml' }]);
    expect(fixes.map((fix) => fix.id)).toEqual(expect.arrayContaining(['add-allulose', 'add-sugar', 'add-xanthan-gum', 'add-guar-gum']));
  });

  it('offers a safe-fill option that lowers estimated volume', () => {
    const items = [{ ingredientId: 'milk-2', amount: 700, unit: 'ml' as const }, { ingredientId: 'whey-vanilla', amount: 30, unit: 'g' as const }];
    const validation = validateRecipe(items, seededIngredients, 'classic');
    const fix = getRecipeFixOptions(items, seededIngredients, 'classic', validation).find((option) => option.id === 'fit-container');
    expect(fix).toBeTruthy();
    expect(validateRecipe(fix!.nextItems, seededIngredients, 'classic').estimatedVolumeMl).toBeLessThan(validation.estimatedVolumeMl);
  });

  it('builds a complete machine-compatible recipe for every beginner answer combination', () => {
    const textures: TexturePreference[] = ['creamy', 'light', 'fruit-forward', 'thick'];
    const flavors: BeginnerFlavor[] = ['strawberry', 'chocolate', 'vanilla', 'mint', 'berry', 'surprise-me'];
    const goals: RecipeGoal[] = ['high-protein', 'classic', 'lower-calorie', 'dairy-free'];
    for (const texture of textures) for (const flavor of flavors) for (const goal of goals) {
      const result = recommendBeginnerRecipe({ answers: { texture, flavor, goal }, ingredients: seededIngredients, machineId: 'nc501' });
      expect(result.items.length).toBeGreaterThanOrEqual(4);
      expect(validateRecipe(result.items, seededIngredients, 'nc501').errors).toHaveLength(0);
    }
  });

  it('keeps every dairy-free recommendation free of dairy ingredients', () => {
    const dairyIds = new Set(['milk-2', 'skim-milk', 'fairlife-2', 'fairlife-fat-free', 'fairlife-chocolate', 'whey-vanilla', 'whey-chocolate', 'casein-vanilla', 'cottage-cheese-low-fat', 'cream-cheese', 'cookie-pieces']);
    const flavors: BeginnerFlavor[] = ['strawberry', 'chocolate', 'vanilla', 'mint', 'berry', 'surprise-me'];
    for (const flavor of flavors) {
      const result = recommendBeginnerRecipe({ answers: { texture: 'creamy', flavor, goal: 'dairy-free' }, ingredients: seededIngredients, machineId: 'nc501' });
      expect(result.items.some((item) => dairyIds.has(item.ingredientId))).toBe(false);
    }
  });

  it('blocks a recommendation when no eligible base remains', () => {
    const withoutBases = seededIngredients.filter((ingredient) => ingredient.category !== 'base');
    const result = recommendBeginnerRecipe({ answers: { texture: 'creamy', flavor: 'strawberry', goal: 'high-protein' }, ingredients: withoutBases, machineId: 'nc501' });
    expect(result.blockedReason).toContain('No base ingredient');
    expect(result.items.some((item) => withoutBases.find((ingredient) => ingredient.id === item.ingredientId)?.category === 'base')).toBe(false);
  });

  it('proposes pantry substitutions without changing the current recipe', () => {
    const items = [{ ingredientId: 'milk-2', amount: 300, unit: 'ml' as const }, { ingredientId: 'whey-vanilla', amount: 25, unit: 'g' as const }];
    const original = JSON.parse(JSON.stringify(items));
    const proposals = getPantrySubstitutionProposals(items, ['soy-milk', 'pea-protein'], seededIngredients);
    expect(proposals.map((proposal) => proposal.replacement.ingredientId)).toEqual(expect.arrayContaining(['soy-milk', 'pea-protein']));
    expect(new Set(proposals.map((proposal) => proposal.replacement.ingredientId)).size).toBe(proposals.length);
    expect(proposals.every((proposal) => proposal.original.unit === proposal.replacement.unit)).toBe(true);
    expect(items).toEqual(original);
  });
});
