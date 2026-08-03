import type { DisplayUnit, Ingredient, MeasurementMode, Nutrition, RecipeIngredient, Unit } from '@/src/types';

type NutritionTotals = Nutrition & { addedSugar: number };

export const KITCHEN_ML_PER_CUP = 240;
export const KITCHEN_ML_PER_TBSP = 15;
export const KITCHEN_ML_PER_TSP = 5;

export const zeroNutrition = (): NutritionTotals => ({ calories: 0, protein: 0, carbs: 0, sugar: 0, addedSugar: 0, fat: 0, fiber: 0 });
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function calculateNutrition(items: RecipeIngredient[], ingredients: Ingredient[]): NutritionTotals {
  const total = items.reduce((sum, item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
    if (!ingredient) return sum;
    const ratio = item.amount / ingredient.referenceAmount;
    return {
      calories: sum.calories + ingredient.nutrition.calories * ratio,
      protein: sum.protein + ingredient.nutrition.protein * ratio,
      carbs: sum.carbs + ingredient.nutrition.carbs * ratio,
      sugar: sum.sugar + ingredient.nutrition.sugar * ratio,
      addedSugar: (sum.addedSugar ?? 0) + (ingredient.nutrition.addedSugar ?? 0) * ratio,
      fat: sum.fat + ingredient.nutrition.fat * ratio,
      fiber: sum.fiber + ingredient.nutrition.fiber * ratio,
    };
  }, zeroNutrition());
  return { calories: Math.round(total.calories), protein: round(total.protein), carbs: round(total.carbs), sugar: round(total.sugar), addedSugar: round(total.addedSugar ?? 0), fat: round(total.fat), fiber: round(total.fiber) };
}

export function estimateVolumeMl(items: RecipeIngredient[]): number {
  return round(items.reduce((sum, item) => item.unit === 'ml' ? sum + item.amount : item.unit === 'tsp' ? sum + item.amount * 4.93 : sum + item.amount * 0.86, 0), 0);
}

const commonFractions: [number, string][] = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'], [1, '']];

function formatFraction(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;
  const closest = commonFractions.reduce((best, current) => Math.abs(current[0] - remainder) < Math.abs(best[0] - remainder) ? current : best);
  if (closest[0] === 1) return `${whole + 1}`;
  if (closest[0] === 0) return `${whole}`;
  return `${whole ? `${whole} ` : ''}${closest[1]}`;
}

const cupFractions: [number, string][] = [[0.75, '¾'], [2 / 3, '⅔'], [0.5, '½'], [1 / 3, '⅓'], [0.25, '¼']];

/** Practical kitchen output using 240 ml cups, 15 ml tablespoons and 5 ml teaspoons. */
export function formatKitchenVolume(amountMl: number): string {
  if (amountMl <= 0) return '0 tsp';
  let remaining = amountMl;
  let cups = Math.floor((remaining + 0.01) / KITCHEN_ML_PER_CUP);
  remaining -= cups * KITCHEN_ML_PER_CUP;
  let cupFraction = '';
  if (remaining >= KITCHEN_ML_PER_CUP / 4) {
    const fraction = cupFractions.find(([portion]) => remaining + 0.01 >= portion * KITCHEN_ML_PER_CUP);
    if (fraction) { cupFraction = fraction[1]; remaining -= fraction[0] * KITCHEN_ML_PER_CUP; }
  }
  let tablespoons = Math.floor((remaining + 0.01) / KITCHEN_ML_PER_TBSP);
  remaining -= tablespoons * KITCHEN_ML_PER_TBSP;
  let teaspoons = Math.round((remaining / KITCHEN_ML_PER_TSP) * 4) / 4;
  if (teaspoons >= 3) { tablespoons += 1; teaspoons = 0; }
  if (tablespoons >= 16) { cups += 1; tablespoons -= 16; }

  const parts: string[] = [];
  if (cups || cupFraction) {
    const amount = `${cups || ''}${cups && cupFraction ? ' ' : ''}${cupFraction}`;
    const label = cups === 0 || (cups === 1 && !cupFraction) ? 'cup' : 'cups';
    parts.push(`${amount} ${label}`);
  }
  if (tablespoons) parts.push(`${tablespoons} tbsp`);
  if (teaspoons) parts.push(`${formatFraction(teaspoons)} tsp`);
  return parts.length ? parts.join(' + ') : '¼ tsp';
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

export function displayUnitOptions(unit: Unit, system: 'metric' | 'us', mode: MeasurementMode): DisplayUnit[] {
  if (unit === 'ml') {
    if (system === 'us' && mode === 'kitchen') return ['cup', 'tbsp', 'tsp', 'fl-oz', 'ml'];
    if (system === 'us') return ['fl-oz', 'ml'];
    return ['ml'];
  }
  if (unit === 'g') return system === 'us' ? ['oz', 'g'] : ['g'];
  return mode === 'kitchen' ? ['tsp', 'tbsp'] : ['tsp'];
}

/** A practical single-tap increment for each editable display unit. */
export function displayAmountStep(displayUnit: DisplayUnit, precise = false): number {
  if (precise) {
    if (displayUnit === 'cup') return 0.05;
    if (displayUnit === 'tbsp' || displayUnit === 'tsp') return 0.25;
    if (displayUnit === 'fl-oz' || displayUnit === 'oz') return 0.1;
    return 1;
  }
  if (displayUnit === 'cup') return 0.25;
  if (displayUnit === 'tbsp' || displayUnit === 'tsp') return 0.5;
  if (displayUnit === 'fl-oz') return 0.5;
  if (displayUnit === 'oz') return 0.5;
  if (displayUnit === 'ml') return 10;
  return 5;
}

export function editableAmount(amount: number, unit: Unit, displayUnit: DisplayUnit): number {
  if (displayUnit === 'cup') return amount / KITCHEN_ML_PER_CUP;
  if (displayUnit === 'tbsp') return amount / (unit === 'ml' ? KITCHEN_ML_PER_TBSP : 3);
  if (displayUnit === 'tsp') return amount / (unit === 'ml' ? KITCHEN_ML_PER_TSP : 1);
  if (displayUnit === 'fl-oz') return amount / 29.5735;
  if (displayUnit === 'oz') return amount / 28.3495;
  return amount;
}

export function displayAmount(amount: number, unit: Unit, system: 'metric' | 'us', mode: MeasurementMode = 'exact'): string {
  if (mode === 'kitchen' && system === 'us' && unit === 'ml') return formatKitchenVolume(amount);
  const displayUnit = preferredDisplayUnit(unit, system, mode);
  if (displayUnit === 'cup') return `${formatFraction(amount / KITCHEN_ML_PER_CUP)} cup`;
  if (displayUnit === 'tbsp') return `${formatFraction(amount / (unit === 'ml' ? KITCHEN_ML_PER_TBSP : 1))} tbsp`;
  if (displayUnit === 'tsp') return `${formatFraction(amount / (unit === 'ml' ? KITCHEN_ML_PER_TSP : 1))} tsp`;
  if (displayUnit === 'fl-oz') return `${round(amount / 29.5735, 1)} fl oz`;
  if (displayUnit === 'oz') return `${round(amount / 28.3495, 1)} oz`;
  const value = amount < 10 ? round(amount, 2) : round(amount, 0);
  return `${value} ${displayUnit}`;
}

export function parseDisplayAmount(value: number, displayUnit: DisplayUnit, canonicalUnit?: Unit): { amount: number; unit: Unit } {
  if (displayUnit === 'cup') return { amount: value * KITCHEN_ML_PER_CUP, unit: 'ml' };
  if (displayUnit === 'tbsp') return canonicalUnit === 'tsp' ? { amount: value * 3, unit: 'tsp' } : { amount: value * KITCHEN_ML_PER_TBSP, unit: 'ml' };
  if (displayUnit === 'tsp') return { amount: value, unit: 'tsp' };
  if (displayUnit === 'fl-oz') return { amount: value * 29.5735, unit: 'ml' };
  if (displayUnit === 'oz') return { amount: value * 28.3495, unit: 'g' };
  return { amount: value, unit: displayUnit };
}
