import type { DietaryPreference, FoodAllergen, Ingredient, IngredientEligibilityResult, Recipe, UserSettings } from '@/src/types';

export const ALLERGY_SAFETY_NOTICE = 'CreamyTuner filters using information stored in the app, but recipes, labels, and manufacturing practices can change, and cross-contact is possible. Always read the current package label. Do not rely on CreamyTuner as your only allergy check.';

export const foodAllergenLabels: Record<FoodAllergen, string> = {
  milk: 'Milk', egg: 'Egg', fish: 'Fish', 'crustacean-shellfish': 'Crustacean shellfish',
  'tree-nuts': 'Tree nuts', peanuts: 'Peanuts', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame',
};

const dairyIds = new Set([
  'whey-vanilla', 'whey-chocolate', 'casein-vanilla', 'skim-milk-powder', 'milk-2', 'skim-milk', 'whole-milk',
  'greek-yogurt', 'cottage-cheese-low-fat', 'cream-cheese', 'evaporated-milk', 'half-and-half', 'heavy-cream',
  'kefir', 'ricotta', 'fairlife-2', 'fairlife-fat-free', 'fairlife-chocolate', 'chobani-zero-plain', 'fage-0',
  'daisy-cottage-2', 'philadelphia-original', 'on-vanilla-whey', 'dymatize-iso100-vanilla',
]);
const uncertainDairyIds = new Set(['cheesecake-pudding', 'jello-vanilla-zero', 'jello-cheesecake-zero']);
const animalIds = new Set(['collagen', 'egg-white-powder', 'gelatin', 'honey']);
const vegetarianExcludedIds = new Set(['collagen', 'gelatin']);
const glutenIds = new Set(['cookie-pieces', 'graham-crumbs']);
const addedSugarIds = new Set(['sugar', 'brown-sugar', 'honey', 'maple-syrup', 'agave', 'dark-chocolate', 'cookie-pieces', 'graham-crumbs']);

const searchable = (ingredient: Ingredient) => `${ingredient.id} ${ingredient.name} ${ingredient.subtitle} ${ingredient.brand ?? ''} ${(ingredient.tags ?? []).join(' ')} ${ingredient.allergenStatement ?? ''}`.toLowerCase();
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const phraseMatches = (text: string, phrase: string) => {
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase) && ` ${normalize(text)} `.includes(` ${normalizedPhrase} `);
};

const customDairyMarkers = ['whey', 'casein', 'cottage cheese', 'cream cheese', 'dairy', 'yogurt', 'whole milk', 'skim milk', '2 milk', 'heavy cream', 'half and half'];
const customAnimalMarkers = ['gelatin', 'collagen', 'honey', 'egg white'];

function dietaryReason(ingredient: Ingredient, preferences: DietaryPreference[]): string | null {
  const text = searchable(ingredient);
  const dairyFree = preferences.includes('dairy-free') || preferences.includes('vegan');
  if (dairyFree && (dairyIds.has(ingredient.id) || uncertainDairyIds.has(ingredient.id))) return 'Does not match the selected dairy-free preference.';
  if (dairyFree && ingredient.isCustom && customDairyMarkers.some((marker) => phraseMatches(text, marker))) return 'The custom ingredient appears to contain dairy.';
  if (preferences.includes('vegan') && (animalIds.has(ingredient.id) || text.includes('egg white'))) return 'Does not match the selected vegan preference.';
  if (preferences.includes('vegan') && ingredient.isCustom && customAnimalMarkers.some((marker) => phraseMatches(text, marker))) return 'The custom ingredient appears to contain an animal-derived ingredient.';
  if (preferences.includes('vegetarian') && vegetarianExcludedIds.has(ingredient.id)) return 'Does not match the selected vegetarian preference.';
  if (preferences.includes('gluten-free') && glutenIds.has(ingredient.id)) return 'Does not match the selected gluten-free preference.';
  if (preferences.includes('no-added-sugar') && (addedSugarIds.has(ingredient.id) || (ingredient.nutrition.addedSugar ?? 0) > 0)) return 'Contains added sugar.';
  return null;
}

export function getIngredientEligibility(ingredient: Ingredient, preferences: DietaryPreference[] = [], allergies: FoodAllergen[] = [], customAvoidFoods: string[] = []): IngredientEligibilityResult {
  const dietary = dietaryReason(ingredient, preferences);
  if (dietary) return { status: 'blocked-dietary', allowed: false, reasons: [dietary] };

  const recorded = new Set([...(ingredient.allergens ?? []), ...(ingredient.mayContainAllergens ?? [])]);
  const conflicts = allergies.filter((allergen) => recorded.has(allergen));
  const customConflicts = customAvoidFoods.filter((phrase) => phraseMatches(searchable(ingredient), phrase));
  if (conflicts.length || customConflicts.length) {
    const reasons = [
      ...conflicts.map((allergen) => `Conflicts with your ${foodAllergenLabels[allergen]} allergy setting.`),
      ...customConflicts.map((phrase) => `Matches your “${phrase}” avoid setting.`),
    ];
    return { status: 'blocked-allergy', allowed: false, reasons };
  }
  if ((allergies.length || customAvoidFoods.length) && (ingredient.allergenDataStatus ?? 'incomplete') === 'incomplete') {
    return { status: 'label-check-required', allowed: false, reasons: ['Allergen information is incomplete. Check the current package label before adding it.'] };
  }
  return { status: 'allowed', allowed: true, reasons: [] };
}

export function ingredientMatchesPreferences(ingredient: Ingredient, preferences: DietaryPreference[], allergies: FoodAllergen[] = [], customAvoidFoods: string[] = []) {
  return getIngredientEligibility(ingredient, preferences, allergies, customAvoidFoods).allowed;
}

export function filterIngredientsForPreferences(ingredients: Ingredient[], preferences: DietaryPreference[], allergies: FoodAllergen[] = [], customAvoidFoods: string[] = []) {
  return ingredients.filter((ingredient) => getIngredientEligibility(ingredient, preferences, allergies, customAvoidFoods).allowed);
}

export function partitionIngredientEligibility(ingredients: Ingredient[], settings: Pick<UserSettings, 'dietaryPreferences' | 'foodAllergies' | 'customAvoidFoods'>) {
  const allowed: Ingredient[] = [];
  const labelCheck: Ingredient[] = [];
  for (const ingredient of ingredients) {
    const result = getIngredientEligibility(ingredient, settings.dietaryPreferences, settings.foodAllergies, settings.customAvoidFoods);
    if (result.allowed) allowed.push(ingredient);
    else if (result.status === 'label-check-required') labelCheck.push(ingredient);
  }
  return { allowed, labelCheck };
}

export function getRecipeEligibility(recipe: Recipe, ingredients: Ingredient[], settings: Pick<UserSettings, 'dietaryPreferences' | 'foodAllergies' | 'customAvoidFoods'>) {
  return recipe.ingredients.map((item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
    return ingredient ? { ingredient, result: getIngredientEligibility(ingredient, settings.dietaryPreferences, settings.foodAllergies, settings.customAvoidFoods) } : null;
  }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).filter((entry) => !entry.result.allowed);
}
