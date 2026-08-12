import type { FoodAllergen, IngredientCategory, Unit } from '@/src/types';

export type NutritionLabelDraft = {
  name?: string;
  brand?: string;
  category?: IngredientCategory;
  referenceAmount?: number;
  unit?: Unit;
  calories?: number;
  protein?: number;
  carbs?: number;
  sugar?: number;
  addedSugar?: number;
  fat?: number;
  fiber?: number;
  allergens: FoodAllergen[];
  mayContainAllergens: FoodAllergen[];
  rawText: string;
  warnings: string[];
};

const allergenTerms: [FoodAllergen, RegExp][] = [
  ['milk', /\bmilk\b/i], ['egg', /\beggs?\b/i], ['fish', /\bfish\b/i],
  ['crustacean-shellfish', /\b(?:shellfish|shrimp|crab|lobster)\b/i],
  ['tree-nuts', /\b(?:tree nuts?|almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|coconut)\b/i],
  ['peanuts', /\bpeanuts?\b/i], ['wheat', /\bwheat\b/i], ['soy', /\bsoy(?:beans?)?\b/i], ['sesame', /\bsesame\b/i],
];

function numberAfter(text: string, pattern: string) {
  const match = text.match(new RegExp(`${pattern}\\s*[:]?\\s*(\\d+(?:[.,]\\d+)?)\\s*g?`, 'i'));
  return match ? Number(match[1].replace(',', '.')) : undefined;
}

function allergensIn(text: string) {
  return allergenTerms.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}

function likelyCategory(name: string): IngredientCategory {
  if (/milk|cream|yogurt|cottage|beverage|drink/i.test(name)) return 'base';
  if (/protein|whey|casein|collagen/i.test(name)) return 'protein';
  if (/sugar|honey|syrup|sweet/i.test(name)) return 'sweetener';
  if (/gum|pudding|starch|gelatin/i.test(name)) return 'stabilizer';
  if (/berry|berries|banana|mango|peach|cherry|fruit/i.test(name)) return 'fruit';
  if (/chip|cookie|candy|pretzel|nib/i.test(name)) return 'mix-in';
  return 'flavoring';
}

function cleanFrontLine(line: string) {
  return line.replace(/[^\p{L}\p{N}&'®™+\- .]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function parseNutritionLabel(frontText: string, nutritionText: string): NutritionLabelDraft {
  const frontLines = frontText.split(/\r?\n/).map(cleanFrontLine).filter((line) => line.length >= 2 && !/nutrition facts|serving size|calories/i.test(line));
  const name = frontLines.slice(0, 2).join(' ').slice(0, 80) || undefined;
  const servingLine = nutritionText.match(/serving\s*size[^\n\r]*/i)?.[0] ?? '';
  const serving = servingLine.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/i)
    ?? servingLine.match(/\b(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
  const referenceAmount = serving ? Number(serving[1]) : undefined;
  const unit = serving ? serving[2].toLowerCase() as Unit : undefined;
  const containsBlock = nutritionText.match(/contains?\s*:?\s*([^\n\r.]+)/i)?.[1] ?? '';
  const mayContainBlock = nutritionText.match(/may\s+contain\s*:?\s*([^\n\r.]+)/i)?.[1] ?? '';
  const caloriesMatch = nutritionText.match(/calories\s*[:]?\s*(\d+(?:\.\d+)?)/i);
  const warnings: string[] = [];
  if (!name) warnings.push('Check the product name.');
  if (!referenceAmount || !unit) warnings.push('Check the serving size and unit.');
  if (!caloriesMatch) warnings.push('Check calories; they were not read confidently.');
  if (!/protein/i.test(nutritionText)) warnings.push('Check protein; it was not found.');

  return {
    name,
    category: likelyCategory(name ?? ''),
    referenceAmount,
    unit,
    calories: caloriesMatch ? Number(caloriesMatch[1]) : undefined,
    fat: numberAfter(nutritionText, 'total\\s+fat'),
    carbs: numberAfter(nutritionText, 'total\\s+carbohydrate'),
    fiber: numberAfter(nutritionText, 'dietary\\s+fiber'),
    sugar: numberAfter(nutritionText, 'total\\s+sugars?'),
    addedSugar: numberAfter(nutritionText, '(?:includes?\\s*)?added\\s+sugars?') ?? numberAfter(nutritionText, 'includes?'),
    protein: numberAfter(nutritionText, 'protein'),
    allergens: allergensIn(containsBlock),
    mayContainAllergens: allergensIn(mayContainBlock),
    rawText: `${frontText}\n\n${nutritionText}`.trim(),
    warnings,
  };
}
