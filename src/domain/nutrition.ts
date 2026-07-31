import type { Ingredient, Nutrition, RecipeIngredient, Unit } from '@/src/types';

export const zeroNutrition = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 });

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function calculateNutrition(items: RecipeIngredient[], ingredients: Ingredient[]): Nutrition {
  const total = items.reduce((sum, item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
    if (!ingredient) return sum;
    const ratio = item.amount / ingredient.referenceAmount;
    return {
      calories: sum.calories + ingredient.nutrition.calories * ratio,
      protein: sum.protein + ingredient.nutrition.protein * ratio,
      carbs: sum.carbs + ingredient.nutrition.carbs * ratio,
      sugar: sum.sugar + ingredient.nutrition.sugar * ratio,
      fat: sum.fat + ingredient.nutrition.fat * ratio,
      fiber: sum.fiber + ingredient.nutrition.fiber * ratio,
    };
  }, zeroNutrition());

  return {
    calories: Math.round(total.calories),
    protein: round(total.protein),
    carbs: round(total.carbs),
    sugar: round(total.sugar),
    fat: round(total.fat),
    fiber: round(total.fiber),
  };
}

export function estimateVolumeMl(items: RecipeIngredient[]): number {
  return round(items.reduce((sum, item) => {
    if (item.unit === 'ml') return sum + item.amount;
    if (item.unit === 'tsp') return sum + item.amount * 4.93;
    return sum + item.amount * 0.86;
  }, 0), 0);
}

export function displayAmount(amount: number, unit: Unit, system: 'metric' | 'us'): string {
  if (system === 'metric') {
    const value = amount < 10 ? round(amount, 2) : round(amount, 0);
    return `${value} ${unit}`;
  }
  if (unit === 'ml') return `${round(amount / 29.5735, 1)} fl oz`;
  if (unit === 'g') return `${round(amount / 28.3495, 1)} oz`;
  return `${round(amount, 2)} tsp`;
}
