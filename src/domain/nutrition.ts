import type { DisplayUnit, Ingredient, MeasurementMode, Nutrition, RecipeIngredient, Unit } from '@/src/types';

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

const commonFractions: [number, string][] = [
  [0, ''], [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'], [1, ''],
];

function formatFraction(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;
  const closest = commonFractions.reduce((best, current) => Math.abs(current[0] - remainder) < Math.abs(best[0] - remainder) ? current : best);
  if (closest[0] === 1) return `${whole + 1}`;
  if (closest[0] === 0) return `${whole}`;
  return `${whole ? `${whole} ` : ''}${closest[1]}`;
}

export function preferredDisplayUnit(unit: Unit, system: 'metric' | 'us', mode: MeasurementMode): DisplayUnit {
  if (mode === 'exact') {
    if (system === 'us' && unit === 'g') return 'oz';
    if (system === 'us' && unit === 'ml') return 'fl-oz';
    return unit;
  }
  if (unit === 'ml') return system === 'us' ? 'cup' : 'ml';
  if (unit === 'tsp') return 'tsp';
  return system === 'us' ? 'oz' : 'g';
}

export function displayAmount(amount: number, unit: Unit, system: 'metric' | 'us', mode: MeasurementMode = 'exact'): string {
  const displayUnit = mode === 'kitchen' && system === 'us' && unit === 'ml'
    ? amount >= 120 ? 'cup' : amount >= 15 ? 'tbsp' : 'tsp'
    : preferredDisplayUnit(unit, system, mode);
  if (displayUnit === 'cup') return `${formatFraction(amount / (unit === 'ml' ? 240 : 1))} cup`;
  if (displayUnit === 'tbsp') return `${formatFraction(amount / (unit === 'ml' ? 14.7868 : 1))} tbsp`;
  if (displayUnit === 'tsp') return `${formatFraction(amount / (unit === 'ml' ? 4.92892 : 1))} tsp`;
  if (displayUnit === 'fl-oz') return `${round(amount / 29.5735, 1)} fl oz`;
  if (displayUnit === 'oz') return `${round(amount / 28.3495, 1)} oz`;
  const value = amount < 10 ? round(amount, 2) : round(amount, 0);
  return `${value} ${displayUnit}`;
}

export function parseDisplayAmount(value: number, displayUnit: DisplayUnit): { amount: number; unit: Unit } {
  if (displayUnit === 'cup') return { amount: value * 240, unit: 'ml' };
  if (displayUnit === 'tbsp') return { amount: value * 15, unit: 'ml' };
  if (displayUnit === 'tsp') return { amount: value, unit: 'tsp' };
  if (displayUnit === 'fl-oz') return { amount: value * 29.5735, unit: 'ml' };
  if (displayUnit === 'oz') return { amount: value * 28.3495, unit: 'g' };
  return { amount: value, unit: displayUnit };
}
