import { seededIngredients } from '@/src/data/ingredients';
import { filterIngredientsForPreferences, getIngredientEligibility, getRecipeEligibility, ingredientMatchesPreferences } from '@/src/domain/dietary';
import { seededRecipes } from '@/src/data/recipes';
import { userSettingsSchema } from '@/src/types';
import { tutorialBaseTemplates } from '@/src/domain/tutorial';

const idsFor = (preferences: Parameters<typeof filterIngredientsForPreferences>[1]) =>
  new Set(filterIngredientsForPreferences(seededIngredients, preferences).map((ingredient) => ingredient.id));

describe('tutorial dietary eligibility', () => {
  test('dairy-free keeps plant bases and removes dairy and uncertain pudding mixes', () => {
    const ids = idsFor(['dairy-free']);
    expect(ids.has('soy-milk')).toBe(true);
    expect(ids.has('almond-milk')).toBe(true);
    expect(ids.has('xanthan-gum')).toBe(true);
    expect(ids.has('milk-2')).toBe(false);
    expect(ids.has('cottage-cheese-low-fat')).toBe(false);
    expect(ids.has('jello-vanilla-zero')).toBe(false);
  });

  test('vegan also removes honey, collagen, gelatin, and egg white', () => {
    const ids = idsFor(['vegan']);
    ['honey', 'collagen', 'gelatin', 'egg-white-powder'].forEach((id) => expect(ids.has(id)).toBe(false));
    expect(ids.has('soy-milk')).toBe(true);
  });

  test('gluten-free and no-added-sugar remove conflicting add-ins and sweeteners', () => {
    const ids = idsFor(['gluten-free', 'no-added-sugar']);
    expect(ids.has('cookie-pieces')).toBe(false);
    expect(ids.has('graham-crumbs')).toBe(false);
    expect(ids.has('sugar')).toBe(false);
    expect(ids.has('maple-syrup')).toBe(false);
    expect(ids.has('monk-fruit')).toBe(true);
  });

  test('custom dairy labels are rejected for plant-only preferences', () => {
    const custom = { ...seededIngredients[0], id: 'custom-yogurt', name: 'Homemade yogurt', isCustom: true };
    expect(ingredientMatchesPreferences(custom, ['dairy-free'])).toBe(false);
  });

  test('the dairy-free base template contains only soy and almond milk', () => {
    expect(tutorialBaseTemplates(709)[2].items.map((item) => item.ingredientId)).toEqual(['soy-milk', 'almond-milk']);
  });

  test('allergy and dietary rules combine as a strict intersection', () => {
    const ids = new Set(filterIngredientsForPreferences(seededIngredients, ['vegan'], ['tree-nuts', 'soy']).map((ingredient) => ingredient.id));
    expect(ids.has('milk-2')).toBe(false);
    expect(ids.has('almond-milk')).toBe(false);
    expect(ids.has('soy-milk')).toBe(false);
    expect(ids.has('strawberries')).toBe(true);
  });

  test('keeps a simple verified mix-in available under strict common restrictions', () => {
    const cacaoNibs = seededIngredients.find((ingredient) => ingredient.id === 'cacao-nibs')!;
    expect(getIngredientEligibility(cacaoNibs, ['vegan', 'gluten-free'], ['milk', 'tree-nuts', 'wheat', 'soy']).status).toBe('allowed');
  });

  test('confirmed and may-contain allergens are blocked', () => {
    const milk = seededIngredients.find((ingredient) => ingredient.id === 'milk-2')!;
    expect(getIngredientEligibility(milk, [], ['milk']).status).toBe('blocked-allergy');
    expect(getIngredientEligibility({ ...milk, id: 'may-contain', allergens: [], mayContainAllergens: ['peanuts'] }, [], ['peanuts']).status).toBe('blocked-allergy');
  });

  test('incomplete labels require an explicit label check when allergies are active', () => {
    const pudding = seededIngredients.find((ingredient) => ingredient.id === 'jello-vanilla-zero')!;
    expect(getIngredientEligibility(pudding, [], ['milk']).status).toBe('label-check-required');
    expect(getIngredientEligibility(pudding, [], []).status).toBe('allowed');
  });

  test('custom avoidance phrases use whole phrase matching', () => {
    const peanut = seededIngredients.find((ingredient) => ingredient.id === 'pb2-original')!;
    expect(getIngredientEligibility(peanut, [], [], ['PB2']).status).toBe('blocked-allergy');
    expect(getIngredientEligibility(peanut, [], [], ['pea']).status).toBe('allowed');
  });

  test('saved recipes are preserved but report conflicts', () => {
    const recipe = seededRecipes.find((candidate) => candidate.ingredients.some((item) => item.ingredientId === 'milk-2'))!;
    const settings = userSettingsSchema.parse({ foodAllergies: ['milk'] });
    expect(getRecipeEligibility(recipe, seededIngredients, settings).some((entry) => entry.ingredient.id === 'milk-2')).toBe(true);
  });
});
