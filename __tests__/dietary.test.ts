import { seededIngredients } from '@/src/data/ingredients';
import { filterIngredientsForPreferences, ingredientMatchesPreferences } from '@/src/domain/dietary';
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
});
