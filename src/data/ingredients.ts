import { ingredientSchema, type Ingredient } from '@/src/types';

const seeds: Ingredient[] = [
  { id: 'whey-vanilla', name: 'Whey Protein', subtitle: 'Vanilla', category: 'protein', defaultUnit: 'g', defaultAmount: 25, referenceAmount: 30, nutrition: { calories: 120, protein: 24, carbs: 3, sugar: 2, fat: 2, fiber: 0 }, rating: 4.8, benefit: 'Best for creaminess', isCustom: false },
  { id: 'whey-chocolate', name: 'Whey Protein', subtitle: 'Chocolate', category: 'protein', defaultUnit: 'g', defaultAmount: 30, referenceAmount: 30, nutrition: { calories: 125, protein: 24, carbs: 4, sugar: 2, fat: 2, fiber: 1 }, rating: 4.7, benefit: 'Fast, creamy texture', isCustom: false },
  { id: 'casein-vanilla', name: 'Casein Protein', subtitle: 'Vanilla', category: 'protein', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 30, nutrition: { calories: 110, protein: 24, carbs: 3, sugar: 1, fat: 1, fiber: 0 }, rating: 4.6, benefit: 'Thick and creamy', isCustom: false },
  { id: 'collagen', name: 'Collagen Peptides', subtitle: 'Unflavored', category: 'protein', defaultUnit: 'g', defaultAmount: 15, referenceAmount: 20, nutrition: { calories: 70, protein: 18, carbs: 0, sugar: 0, fat: 0, fiber: 0 }, rating: 4.2, benefit: 'Light and smooth', isCustom: false },
  { id: 'skim-milk-powder', name: 'Skim Milk Powder', subtitle: 'Dry milk solids', category: 'protein', defaultUnit: 'g', defaultAmount: 18, referenceAmount: 25, nutrition: { calories: 90, protein: 9, carbs: 13, sugar: 13, fat: 0, fiber: 0 }, rating: 4.4, benefit: 'Adds body, reduces iciness', isCustom: false },
  { id: 'milk-2', name: '2% Milk', subtitle: 'Dairy base', category: 'base', defaultUnit: 'ml', defaultAmount: 300, referenceAmount: 100, nutrition: { calories: 50, protein: 3.4, carbs: 4.8, sugar: 4.8, fat: 2, fiber: 0 }, isCustom: false },
  { id: 'skim-milk', name: 'Skim Milk', subtitle: 'Lean dairy base', category: 'base', defaultUnit: 'ml', defaultAmount: 300, referenceAmount: 100, nutrition: { calories: 34, protein: 3.4, carbs: 5, sugar: 5, fat: 0.1, fiber: 0 }, isCustom: false },
  { id: 'almond-milk', name: 'Almond Milk', subtitle: 'Unsweetened', category: 'base', defaultUnit: 'ml', defaultAmount: 300, referenceAmount: 100, nutrition: { calories: 15, protein: 0.5, carbs: 0.6, sugar: 0, fat: 1.2, fiber: 0.3 }, isCustom: false },
  { id: 'soy-milk', name: 'Soy Milk', subtitle: 'Unsweetened · thicker swap', category: 'base', defaultUnit: 'ml', defaultAmount: 300, referenceAmount: 100, nutrition: { calories: 33, protein: 3.3, carbs: 0.8, sugar: 0.2, fat: 2, fiber: 0.4 }, isCustom: false },
  { id: 'coconut-milk', name: 'Coconut Milk', subtitle: 'Light, canned', category: 'base', defaultUnit: 'ml', defaultAmount: 240, referenceAmount: 100, nutrition: { calories: 75, protein: 0.8, carbs: 2, sugar: 1.4, fat: 7.3, fiber: 0 }, isCustom: false },
  { id: 'greek-yogurt', name: 'Greek Yogurt', subtitle: 'Nonfat, plain', category: 'base', defaultUnit: 'g', defaultAmount: 100, referenceAmount: 100, nutrition: { calories: 59, protein: 10.3, carbs: 3.6, sugar: 3.2, fat: 0.4, fiber: 0 }, isCustom: false },
  { id: 'cottage-cheese-low-fat', name: 'Low-fat Cottage Cheese', subtitle: 'Blended for body', category: 'base', defaultUnit: 'g', defaultAmount: 50, referenceAmount: 100, nutrition: { calories: 72, protein: 12.4, carbs: 3.4, sugar: 2.7, fat: 1, fiber: 0 }, isCustom: false },
  { id: 'cream-cheese', name: 'Cream Cheese', subtitle: 'Full-fat · richness', category: 'base', defaultUnit: 'g', defaultAmount: 30, referenceAmount: 100, nutrition: { calories: 342, protein: 6.2, carbs: 4.1, sugar: 3.2, fat: 34.4, fiber: 0 }, isCustom: false },
  { id: 'allulose', name: 'Allulose', subtitle: 'Low-calorie sweetener', category: 'sweetener', defaultUnit: 'g', defaultAmount: 15, referenceAmount: 10, nutrition: { calories: 4, protein: 0, carbs: 10, sugar: 0, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'sugar', name: 'Granulated Sugar', subtitle: 'Classic sweetness', category: 'sweetener', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 100, nutrition: { calories: 387, protein: 0, carbs: 100, sugar: 100, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'brown-sugar', name: 'Brown Sugar', subtitle: 'Caramel depth', category: 'sweetener', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 100, nutrition: { calories: 380, protein: 0, carbs: 98, sugar: 97, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'maple-syrup', name: 'Maple Syrup', subtitle: 'Pure maple', category: 'sweetener', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 20, nutrition: { calories: 52, protein: 0, carbs: 13.4, sugar: 12, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'honey', name: 'Honey', subtitle: 'Floral honey', category: 'sweetener', defaultUnit: 'g', defaultAmount: 18, referenceAmount: 20, nutrition: { calories: 61, protein: 0.1, carbs: 16.5, sugar: 16.4, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'stevia', name: 'Stevia Blend', subtitle: 'Very sweet, use sparingly', category: 'sweetener', defaultUnit: 'g', defaultAmount: 2, referenceAmount: 100, nutrition: { calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'erythritol', name: 'Erythritol', subtitle: 'Cooling, low-calorie sweetener', category: 'sweetener', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 100, nutrition: { calories: 20, protein: 0, carbs: 100, sugar: 0, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'cheesecake-pudding', name: 'Cheesecake Pudding Mix', subtitle: 'Sugar-free', category: 'stabilizer', defaultUnit: 'tsp', defaultAmount: 3, referenceAmount: 3, nutrition: { calories: 10, protein: 0, carbs: 3, sugar: 0, fat: 0, fiber: 0 }, rating: 4.5, benefit: 'Creamy cheesecake body', isCustom: false },
  { id: 'guar-gum', name: 'Guar Gum', subtitle: 'Texture stabilizer', category: 'stabilizer', defaultUnit: 'tsp', defaultAmount: 0.25, referenceAmount: 1, nutrition: { calories: 7, protein: 0, carbs: 1.8, sugar: 0, fat: 0, fiber: 1.8 }, rating: 4.7, benefit: 'Smooths icy texture', isCustom: false },
  { id: 'xanthan-gum', name: 'Xanthan Gum', subtitle: 'Texture stabilizer', category: 'stabilizer', defaultUnit: 'tsp', defaultAmount: 0.25, referenceAmount: 1, nutrition: { calories: 10, protein: 0, carbs: 2.4, sugar: 0, fat: 0, fiber: 2.4 }, isCustom: false },
  { id: 'salt', name: 'Fine Salt', subtitle: 'A pinch', category: 'flavoring', defaultUnit: 'tsp', defaultAmount: 0.125, referenceAmount: 1, nutrition: { calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'strawberries', name: 'Strawberries', subtitle: 'Frozen', category: 'fruit', defaultUnit: 'g', defaultAmount: 100, referenceAmount: 100, nutrition: { calories: 32, protein: 0.7, carbs: 7.7, sugar: 4.9, fat: 0.3, fiber: 2 }, isCustom: false },
  { id: 'banana', name: 'Banana', subtitle: 'Ripe', category: 'fruit', defaultUnit: 'g', defaultAmount: 100, referenceAmount: 100, nutrition: { calories: 89, protein: 1.1, carbs: 22.8, sugar: 12.2, fat: 0.3, fiber: 2.6 }, isCustom: false },
  { id: 'mango', name: 'Mango', subtitle: 'Frozen chunks', category: 'fruit', defaultUnit: 'g', defaultAmount: 130, referenceAmount: 100, nutrition: { calories: 60, protein: 0.8, carbs: 15, sugar: 13.7, fat: 0.4, fiber: 1.6 }, isCustom: false },
  { id: 'vanilla', name: 'Vanilla Extract', subtitle: 'Pure extract', category: 'flavoring', defaultUnit: 'tsp', defaultAmount: 1, referenceAmount: 1, nutrition: { calories: 12, protein: 0, carbs: 0.6, sugar: 0.5, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'cocoa', name: 'Cocoa Powder', subtitle: 'Unsweetened', category: 'flavoring', defaultUnit: 'g', defaultAmount: 10, referenceAmount: 10, nutrition: { calories: 23, protein: 2, carbs: 5.8, sugar: 0.2, fat: 1.4, fiber: 3.7 }, isCustom: false },
  { id: 'peppermint', name: 'Peppermint Extract', subtitle: 'Pure extract', category: 'flavoring', defaultUnit: 'tsp', defaultAmount: 0.25, referenceAmount: 1, nutrition: { calories: 12, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 }, isCustom: false },
  { id: 'dark-chocolate', name: 'Dark Chocolate Chips', subtitle: '70% cacao', category: 'mix-in', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 20, nutrition: { calories: 105, protein: 1.6, carbs: 12, sugar: 7, fat: 7, fiber: 2.2 }, isCustom: false },
  { id: 'cookie-pieces', name: 'Chocolate Cookie Pieces', subtitle: 'Crushed', category: 'mix-in', defaultUnit: 'g', defaultAmount: 20, referenceAmount: 20, nutrition: { calories: 96, protein: 1, carbs: 14, sugar: 8, fat: 4, fiber: 0.7 }, isCustom: false },
];

export const seededIngredients = ingredientSchema.array().parse(seeds);

export const ingredientById = (id: string, custom: Ingredient[] = []) =>
  [...seededIngredients, ...custom].find((ingredient) => ingredient.id === id);

export const ingredientCategoryLabels: Record<Ingredient['category'], string> = {
  protein: 'Protein',
  base: 'Milk & base',
  sweetener: 'Sweetener',
  stabilizer: 'Pudding & stabilizer',
  fruit: 'Fruit',
  flavoring: 'Flavoring',
  'mix-in': 'Mix-ins',
};
