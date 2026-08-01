import { machineById, programs } from '@/src/data/machines';
import { calculateNutrition, estimateVolumeMl } from '@/src/domain/nutrition';
import type { BuilderPreferences, GuidedRecommendation, Ingredient, ProgramRecommendation, Recipe, RecipeIngredient, RecipeStyle, RecipeValidation } from '@/src/types';

export function validateRecipe(items: RecipeIngredient[], ingredients: Ingredient[], machineId: string): RecipeValidation {
  const machine = machineById(machineId);
  const estimatedVolumeMl = estimateVolumeMl(items);
  const categories = new Set(items.map((item) => ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.category));
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!categories.has('base') && !categories.has('fruit')) errors.push('Add a milk, yogurt, plant base, or fruit base.');
  if (estimatedVolumeMl > machine.capacityMl * 0.92) errors.push(`This recipe may exceed the safe fill target for the ${machine.shortName} container.`);
  if (!categories.has('sweetener') && !categories.has('fruit')) warnings.push('Very low sugar bases can freeze hard; consider a sweetener or fruit.');
  if (!categories.has('stabilizer')) warnings.push('A small amount of stabilizer can reduce iciness in lighter recipes.');
  if (items.length < 3) warnings.push('A balanced pint usually uses at least three ingredient roles.');
  return { estimatedVolumeMl, errors, warnings };
}

export function recommendProgram(recipe: Pick<Recipe, 'style' | 'nutrition' | 'ingredients'>, machineId: string): ProgramRecommendation {
  const machine = machineById(machineId);
  const desired = recipe.style === 'smoothie-bowl' ? programs.smoothie.id : recipe.style;
  let selected = machine.programs.find((candidate) => candidate.id === desired);
  let reason = `Matches the ${recipe.style.replaceAll('-', ' ')} recipe style.`;

  if (recipe.nutrition.protein >= 25 && machine.programs.some((candidate) => candidate.id === programs.creamiFit.id)) {
    selected = machine.programs.find((candidate) => candidate.id === programs.creamiFit.id);
    reason = 'This is a protein-forward recipe and your machine includes CreamiFit.';
  } else if ((recipe.nutrition.fat < 6 || recipe.nutrition.sugar < 12) && machine.programs.some((candidate) => candidate.id === programs.lite.id)) {
    selected = machine.programs.find((candidate) => candidate.id === programs.lite.id);
    reason = 'The lower fat or sugar profile is better suited to Lite Ice Cream.';
  }

  selected ??= machine.programs.find((candidate) => candidate.id === programs.iceCream.id) ?? machine.programs[0];
  return {
    program: selected,
    confidence: recipe.ingredients.length >= 4 ? 'high' : 'medium',
    reason,
    alternatives: machine.programs.filter((candidate) => candidate.id !== selected.id).slice(0, 2),
  };
}

export function generateRecipe(input: {
  name: string;
  style: RecipeStyle;
  items: RecipeIngredient[];
  ingredients: Ingredient[];
  existingId?: string;
  imageKey?: Recipe['imageKey'];
  favorite?: boolean;
}): Recipe {
  const now = new Date().toISOString();
  return {
    id: input.existingId ?? `recipe-${Date.now()}`,
    name: input.name.trim() || 'My Creamy Creation',
    style: input.style,
    ingredients: input.items,
    nutrition: calculateNutrition(input.items, input.ingredients),
    directions: [
      'Whisk or blend the base until completely smooth.',
      'Pour into the correct machine container without exceeding its max-fill line.',
      'Freeze flat for at least 24 hours.',
      'Run the recommended program, then evaluate before using Re-Spin or Mix-In.',
    ],
    notes: 'Nutrition is an estimate based on stored label data. Verify ingredient labels for dietary decisions.',
    favorite: input.favorite ?? false,
    isTemplate: false,
    imageKey: input.imageKey ?? 'strawberry',
    createdAt: now,
    updatedAt: now,
  };
}

const thickBaseItems: RecipeIngredient[] = [
  { ingredientId: 'milk-2', amount: 100, unit: 'ml' },
  { ingredientId: 'almond-milk', amount: 300, unit: 'ml' },
  { ingredientId: 'whey-vanilla', amount: 30, unit: 'g' },
  { ingredientId: 'cottage-cheese-low-fat', amount: 50, unit: 'g' },
  { ingredientId: 'cream-cheese', amount: 30, unit: 'g' },
  { ingredientId: 'salt', amount: 0.125, unit: 'tsp' },
  { ingredientId: 'xanthan-gum', amount: 0.25, unit: 'tsp' },
];

export function recommendGuidedRecipe(input: {
  preferences: BuilderPreferences;
  availableIngredientIds: string[];
  ingredients: Ingredient[];
  machineId: string;
}): GuidedRecommendation {
  const availableIds = new Set(input.availableIngredientIds);
  const craving = `${input.preferences.flavor} ${input.preferences.craving}`.toLowerCase();
  const items = thickBaseItems.map((item) => ({ ...item }));
  const warnings: string[] = [];
  const almondIndex = items.findIndex((item) => item.ingredientId === 'almond-milk');
  if (!availableIds.has('almond-milk') && availableIds.has('soy-milk') && almondIndex >= 0) items[almondIndex] = { ...items[almondIndex], ingredientId: 'soy-milk' };
  if (craving.includes('chocolate') || craving.includes('brownie')) {
    const proteinIndex = items.findIndex((item) => item.ingredientId === 'whey-vanilla');
    if (proteinIndex >= 0) items[proteinIndex] = { ...items[proteinIndex], ingredientId: 'whey-chocolate' };
    items.push({ ingredientId: 'cocoa', amount: 10, unit: 'g' });
  }
  if (craving.includes('mint')) items.push({ ingredientId: 'peppermint', amount: 0.25, unit: 'tsp' });
  if (craving.includes('berry') || craving.includes('strawberry')) items.push({ ingredientId: 'strawberries', amount: 100, unit: 'g' });

  const chosen = items.map((item) => input.ingredients.find((ingredient) => ingredient.id === item.ingredientId)).filter((ingredient): ingredient is Ingredient => Boolean(ingredient));
  const missing = chosen.filter((ingredient) => !availableIds.has(ingredient.id));
  const available = chosen.filter((ingredient) => availableIds.has(ingredient.id));
  const optional = input.ingredients.filter((ingredient) => ['fruit', 'flavoring', 'mix-in'].includes(ingredient.category) && !chosen.some((item) => item.id === ingredient.id)).slice(0, 4);
  if (!chosen.some((ingredient) => ingredient.category === 'base')) warnings.push('Choose at least one milk, yogurt, plant base, or fruit before saving.');
  if (estimateVolumeMl(items) > machineById(input.machineId).capacityMl * 0.92) warnings.push('This suggestion is above the safe fill target for the selected machine.');
  return {
    suggestedItems: items,
    available,
    missing,
    optional,
    rationale: availableIds.has('soy-milk') && !availableIds.has('almond-milk')
      ? 'I used soy milk because it is a thicker plant-based swap for almond milk.'
      : 'This base layers dairy, protein, body, and a small amount of stabilizer for a dense, scoopable texture.',
    warnings,
  };
}
