import { machineById, programs } from '@/src/data/machines';
import { calculateNutrition, estimateVolumeMl } from '@/src/domain/nutrition';
import type { Ingredient, ProgramRecommendation, Recipe, RecipeIngredient, RecipeStyle, RecipeValidation } from '@/src/types';

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
    imageKey: input.imageKey ?? 'strawberry',
    createdAt: now,
    updatedAt: now,
  };
}
