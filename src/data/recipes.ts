import { seededIngredients } from '@/src/data/ingredients';
import { calculateNutrition } from '@/src/domain/nutrition';
import { recipeSchema, type Recipe, type RecipeIngredient, type RecipeStyle } from '@/src/types';

function seedRecipe(id: string, name: string, style: RecipeStyle, ingredients: RecipeIngredient[], imageKey: Recipe['imageKey'], favorite = false): Recipe {
  const date = '2026-07-31T12:00:00.000Z';
  return recipeSchema.parse({
    id,
    name,
    style,
    ingredients,
    nutrition: calculateNutrition(ingredients, seededIngredients),
    directions: [
      'Blend the base ingredients until smooth.',
      'Fill the correct container below the max-fill line and freeze flat for 24 hours.',
      'Run the recommended program.',
      'Add mix-ins after the first spin and use the Mix-In program if desired.',
    ],
    notes: 'Starter recipe. Adjust sweetness and flavor to taste before freezing.',
    favorite,
    imageKey,
    createdAt: date,
    updatedAt: date,
  });
}

export const seededRecipes: Recipe[] = [
  seedRecipe('strawberry-cheesecake', 'Strawberry Cheesecake Protein Ice Cream', 'lite-ice-cream', [
    { ingredientId: 'milk-2', amount: 300, unit: 'ml' },
    { ingredientId: 'whey-vanilla', amount: 25, unit: 'g' },
    { ingredientId: 'allulose', amount: 15, unit: 'g' },
    { ingredientId: 'cheesecake-pudding', amount: 3, unit: 'tsp' },
    { ingredientId: 'strawberries', amount: 100, unit: 'g' },
  ], 'strawberry', true),
  seedRecipe('chocolate-brownie', 'Chocolate Brownie Protein Ice Cream', 'lite-ice-cream', [
    { ingredientId: 'skim-milk', amount: 310, unit: 'ml' },
    { ingredientId: 'whey-chocolate', amount: 30, unit: 'g' },
    { ingredientId: 'cocoa', amount: 10, unit: 'g' },
    { ingredientId: 'allulose', amount: 16, unit: 'g' },
    { ingredientId: 'dark-chocolate', amount: 20, unit: 'g' },
  ], 'chocolate', true),
  seedRecipe('mint-chip', 'Mint Chocolate Chip', 'ice-cream', [
    { ingredientId: 'milk-2', amount: 300, unit: 'ml' },
    { ingredientId: 'casein-vanilla', amount: 20, unit: 'g' },
    { ingredientId: 'allulose', amount: 15, unit: 'g' },
    { ingredientId: 'peppermint', amount: 0.25, unit: 'tsp' },
    { ingredientId: 'dark-chocolate', amount: 20, unit: 'g' },
  ], 'mint'),
  seedRecipe('cookies-cream', 'Cookies & Cream', 'lite-ice-cream', [
    { ingredientId: 'skim-milk', amount: 300, unit: 'ml' },
    { ingredientId: 'whey-vanilla', amount: 25, unit: 'g' },
    { ingredientId: 'allulose', amount: 15, unit: 'g' },
    { ingredientId: 'guar-gum', amount: 0.25, unit: 'tsp' },
    { ingredientId: 'cookie-pieces', amount: 20, unit: 'g' },
  ], 'cookies'),
];
