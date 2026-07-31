import { z } from 'zod';

export const ingredientCategorySchema = z.enum([
  'protein',
  'base',
  'sweetener',
  'stabilizer',
  'fruit',
  'flavoring',
  'mix-in',
]);

export const unitSchema = z.enum(['g', 'ml', 'tsp']);
export const recipeStyleSchema = z.enum([
  'ice-cream',
  'lite-ice-cream',
  'sorbet',
  'gelato',
  'milkshake',
  'smoothie-bowl',
]);

export const nutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  sugar: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().default(0),
});

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().default(''),
  category: ingredientCategorySchema,
  defaultUnit: unitSchema,
  defaultAmount: z.number().positive(),
  referenceAmount: z.number().positive(),
  nutrition: nutritionSchema,
  rating: z.number().min(0).max(5).optional(),
  benefit: z.string().optional(),
  isCustom: z.boolean().default(false),
});

export const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  amount: z.number().positive(),
  unit: unitSchema,
});

export const recipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  style: recipeStyleSchema,
  ingredients: z.array(recipeIngredientSchema).min(1),
  nutrition: nutritionSchema,
  directions: z.array(z.string()),
  notes: z.string().default(''),
  favorite: z.boolean().default(false),
  imageKey: z.enum(['strawberry', 'chocolate', 'mint', 'cookies']).default('strawberry'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userSettingsSchema = z.object({
  onboarded: z.boolean().default(false),
  machineId: z.string().default('nc501'),
  units: z.enum(['metric', 'us']).default('metric'),
  darkMode: z.literal(true).default(true),
  notifications: z.boolean().default(false),
});

export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type RecipeStyle = z.infer<typeof recipeStyleSchema>;
export type Nutrition = z.infer<typeof nutritionSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

export type MachineProgram = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type MachineModel = {
  id: string;
  familyId: 'nc500' | 'nc600' | 'nc300' | 'nc200' | 'nc700';
  name: string;
  shortName: string;
  subtitle: string;
  capacityMl: number;
  programs: MachineProgram[];
  isLegacy?: boolean;
};

export type RecipeValidation = {
  estimatedVolumeMl: number;
  errors: string[];
  warnings: string[];
};

export type ProgramRecommendation = {
  program: MachineProgram;
  confidence: 'high' | 'medium';
  reason: string;
  alternatives: MachineProgram[];
};

export type SpinSession = {
  id: string;
  recipeId?: string;
  machineId: string;
  programId?: string;
  step: number;
  startedAt: string;
  completedAt?: string;
};
