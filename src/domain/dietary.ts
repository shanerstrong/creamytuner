import type { DietaryPreference, Ingredient } from '@/src/types';

const dairyIds = new Set([
  'whey-vanilla', 'whey-chocolate', 'casein-vanilla', 'skim-milk-powder',
  'milk-2', 'skim-milk', 'whole-milk', 'greek-yogurt', 'cottage-cheese-low-fat',
  'cream-cheese', 'evaporated-milk', 'half-and-half', 'heavy-cream', 'kefir',
  'ricotta', 'fairlife-2', 'fairlife-fat-free', 'fairlife-chocolate',
  'chobani-zero-plain', 'fage-0', 'daisy-cottage-2', 'philadelphia-original',
  'on-vanilla-whey', 'dymatize-iso100-vanilla',
]);

const uncertainDairyIds = new Set(['cheesecake-pudding', 'jello-vanilla-zero', 'jello-cheesecake-zero']);
const animalIds = new Set(['collagen', 'egg-white-powder', 'gelatin', 'honey']);
const vegetarianExcludedIds = new Set(['collagen', 'gelatin']);
const glutenIds = new Set(['cookie-pieces', 'graham-crumbs']);
const addedSugarIds = new Set(['sugar', 'brown-sugar', 'honey', 'maple-syrup', 'agave', 'dark-chocolate', 'cookie-pieces', 'graham-crumbs']);

const searchable = (ingredient: Ingredient) => `${ingredient.id} ${ingredient.name} ${ingredient.subtitle} ${ingredient.brand ?? ''} ${(ingredient.tags ?? []).join(' ')}`.toLowerCase();

const customDairyMarkers = ['whey', 'casein', 'cottage cheese', 'cream cheese', 'dairy', 'yogurt', 'whole milk', 'skim milk', '2% milk', 'heavy cream', 'half-and-half'];
const customAnimalMarkers = ['gelatin', 'collagen', 'honey', 'egg white'];

export function ingredientMatchesPreferences(ingredient: Ingredient, preferences: DietaryPreference[]) {
  const text = searchable(ingredient);
  const dairyFree = preferences.includes('dairy-free') || preferences.includes('vegan');
  if (dairyFree && (dairyIds.has(ingredient.id) || uncertainDairyIds.has(ingredient.id))) return false;
  if (dairyFree && ingredient.isCustom && customDairyMarkers.some((marker) => text.includes(marker))) return false;
  if (preferences.includes('vegan') && (animalIds.has(ingredient.id) || text.includes('egg white'))) return false;
  if (preferences.includes('vegan') && ingredient.isCustom && customAnimalMarkers.some((marker) => text.includes(marker))) return false;
  if (preferences.includes('vegetarian') && vegetarianExcludedIds.has(ingredient.id)) return false;
  if (preferences.includes('gluten-free') && glutenIds.has(ingredient.id)) return false;
  if (preferences.includes('no-added-sugar') && (addedSugarIds.has(ingredient.id) || (ingredient.nutrition.addedSugar ?? 0) > 0)) return false;
  return true;
}

export function filterIngredientsForPreferences(ingredients: Ingredient[], preferences: DietaryPreference[]) {
  return ingredients.filter((ingredient) => ingredientMatchesPreferences(ingredient, preferences));
}
