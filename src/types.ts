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
export const displayUnitSchema = z.enum(['g', 'ml', 'tsp', 'tbsp', 'cup', 'oz', 'fl-oz']);
export const measurementModeSchema = z.enum(['exact', 'kitchen']);
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
  addedSugar: z.number().nonnegative().default(0),
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
  brand: z.string().default(''),
  description: z.string().default(''),
  referenceLabel: z.string().default(''),
  sourceUrl: z.string().url().or(z.literal('')).default(''),
  sourceCheckedAt: z.string().default(''),
  popularityRank: z.number().int().nonnegative().default(999),
  tags: z.array(z.string()).default([]),
  typicalUses: z.array(z.string()).default([]),
  substitutions: z.array(z.string()).default([]),
  cautions: z.array(z.string()).default([]),
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
  isTemplate: z.boolean().default(false),
  imageKey: z.enum(['strawberry', 'chocolate', 'mint', 'cookies']).default('strawberry'),
  photoUri: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const texturePreferenceSchema = z.enum(['creamy', 'light', 'fruit-forward', 'thick']);
export const recipeGoalSchema = z.enum(['high-protein', 'classic', 'lower-calorie', 'dairy-free']);
export const beginnerFlavorSchema = z.enum(['strawberry', 'chocolate', 'vanilla', 'mint', 'berry', 'surprise-me']);
export const beginnerBuilderAnswersSchema = z.object({
  texture: texturePreferenceSchema.default('creamy'),
  flavor: beginnerFlavorSchema.default('strawberry'),
  goal: recipeGoalSchema.default('high-protein'),
});
export const beginnerBuilderStageSchema = z.enum(['question-texture', 'question-flavor', 'question-goal', 'recommendation', 'customize', 'review']);
const beginnerBuilderDraftSchema = z.object({
  version: z.literal(2),
  stage: beginnerBuilderStageSchema.default('question-texture'),
  name: z.string().default('My Creamy Creation'),
  answers: beginnerBuilderAnswersSchema.default({ texture: 'creamy', flavor: 'strawberry', goal: 'high-protein' }),
  pantryIds: z.array(z.string()).default([]),
  items: z.array(recipeIngredientSchema).default([]),
  recommendedAmounts: z.record(z.string(), z.number().nonnegative()).default({}),
});
const legacyBuilderDraftSchema = z.object({
  step: z.number().int().min(0).max(6).default(0),
  mode: z.enum(['guided', 'quick']).default('guided'),
  name: z.string().default('My Creamy Creation'),
  preferences: z.object({ style: recipeStyleSchema, flavor: z.string().default('anything'), craving: z.string().default('') }),
  availableIds: z.array(z.string()).default([]),
  items: z.array(recipeIngredientSchema).default([]),
  recommendedIds: z.array(z.string()).default([]),
  recommendedAmounts: z.record(z.string(), z.number().nonnegative()).default({}),
});
export const guidedBuilderDraftSchema = z.union([beginnerBuilderDraftSchema, legacyBuilderDraftSchema]).transform((draft) => {
  if ('version' in draft) return draft;
  const flavor = beginnerFlavorSchema.safeParse(draft.preferences.flavor).success ? beginnerFlavorSchema.parse(draft.preferences.flavor) : 'surprise-me';
  const texture: z.infer<typeof texturePreferenceSchema> = draft.preferences.style === 'sorbet' ? 'fruit-forward' : draft.preferences.style === 'lite-ice-cream' ? 'light' : draft.preferences.style === 'smoothie-bowl' ? 'thick' : 'creamy';
  const ids = new Set(draft.items.map((item) => item.ingredientId));
  const goal: z.infer<typeof recipeGoalSchema> = [...ids].some((id) => /whey|casein|protein/.test(id)) ? 'high-protein' : 'classic';
  return {
    version: 2 as const,
    stage: draft.items.length ? 'customize' as const : 'question-texture' as const,
    name: draft.name,
    answers: { texture, flavor, goal },
    pantryIds: draft.availableIds,
    items: draft.items,
    recommendedAmounts: draft.recommendedAmounts,
  };
});

export const freezeTimerSchema = z.object({
  recipeId: z.string().min(1),
  recipeName: z.string().min(1),
  startedAt: z.string().min(1),
  endsAt: z.string().min(1),
  notificationId: z.string().optional(),
  notificationScheduled: z.boolean().default(false),
});

export const tutorialTextureResultSchema = z.enum(['perfect', 'powdery', 'icy', 'chalky', 'too-soft']);
export const dietaryPreferenceSchema = z.enum(['vegan', 'vegetarian', 'gluten-free', 'no-added-sugar']);
export const tutorialStageSchema = z.enum([
  'machine',
  'dietary',
  'base',
  'helper',
  'sweetener',
  'flavor',
  'blend',
  'freeze',
  'first-spin',
  'evaluate',
  'mix-ins',
  'respin',
  'complete',
]);
const persistedTutorialStageSchema = z.union([tutorialStageSchema, z.literal('correction')])
  .transform((stage) => stage === 'correction' ? 'mix-ins' as const : stage);

const tutorialDraftV3Schema = z.object({
  version: z.literal(3).default(3),
  flowVersion: z.number().int().nonnegative().default(0),
  stage: persistedTutorialStageSchema.default('machine'),
  machineId: z.string().default('nc501'),
  baseItems: z.array(recipeIngredientSchema).default([]),
  selectedIngredientIds: z.array(z.string()).default([]),
  itemAmounts: z.record(z.string(), z.number().positive()).default({}),
  manualAmountIds: z.array(z.string()).default([]),
  mixInId: z.string().nullable().default(null),
  textureResult: tutorialTextureResultSchema.nullable().default(null),
  finalTextureResult: tutorialTextureResultSchema.nullable().default(null),
  spinMinutes: z.number().int().min(1).max(10).default(2),
  photoUri: z.string().default(''),
  recipeId: z.string().default(''),
  recipeName: z.string().default(''),
  dietaryPreferences: z.array(dietaryPreferenceSchema).default([]),
  disclosures: z.array(z.string()).default([]),
  freezeTimerStartedAt: z.string().nullable().default(null),
});

const legacyTutorialDraftSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]).default(2),
  flowVersion: z.number().int().nonnegative().default(0),
  step: z.number().int().min(0).max(10).default(0),
  machineId: z.string().default('nc501'),
  baseId: z.string().default('milk-2'),
  baseAdded: z.boolean().default(false),
  baseAmountMl: z.number().positive().default(300),
  baseItems: z.array(recipeIngredientSchema).default([]),
  proteinId: z.string().nullable().default(null),
  helperId: z.string().nullable().default(null),
  sweetenerId: z.string().nullable().default(null),
  flavorId: z.string().nullable().default(null),
  selectedIngredientIds: z.array(z.string()).default([]),
  itemAmounts: z.record(z.string(), z.number().positive()).default({}),
  manualAmountIds: z.array(z.string()).default([]),
  mixInId: z.string().nullable().default(null),
  textureResult: tutorialTextureResultSchema.default('perfect'),
  recipeId: z.string().default(''),
});

const legacyTutorialStages = ['machine', 'base', 'helper', 'sweetener', 'flavor', 'blend', 'freeze', 'first-spin', 'evaluate', 'mix-ins', 'complete'] as const;

export const tutorialDraftSchema = z.union([tutorialDraftV3Schema, legacyTutorialDraftSchema]).transform((draft) => {
  if (draft.version === 3) return draft;
  const baseItems = draft.baseItems.length
    ? draft.baseItems
    : draft.baseAdded
      ? [{ ingredientId: draft.baseId, amount: draft.baseAmountMl, unit: 'ml' as const }]
      : [];
  const selectedIngredientIds = [...new Set([
    ...draft.selectedIngredientIds,
    draft.proteinId,
    draft.helperId,
    draft.sweetenerId,
    draft.flavorId,
  ].filter((id): id is string => Boolean(id)))];
  return tutorialDraftV3Schema.parse({
    version: 3,
    flowVersion: draft.flowVersion,
    stage: legacyTutorialStages[draft.step] ?? 'machine',
    machineId: draft.machineId,
    baseItems,
    selectedIngredientIds,
    itemAmounts: draft.itemAmounts,
    manualAmountIds: draft.manualAmountIds,
    mixInId: draft.mixInId,
    textureResult: draft.textureResult,
    recipeId: draft.recipeId,
  });
});

export const userSettingsSchema = z.object({
  onboarded: z.boolean().default(false),
  machineId: z.string().default('nc501'),
  units: z.enum(['metric', 'us']).default('us'),
  measurementMode: measurementModeSchema.default('kitchen'),
  darkMode: z.literal(true).default(true),
  notifications: z.boolean().default(false),
  ingredientLibraryView: z.enum(['list', 'grid']).default('list'),
  tutorialMode: z.boolean().default(true),
  firstPintCompleted: z.boolean().default(false),
  guidedBuilderDraft: guidedBuilderDraftSchema.nullable().default(null),
  activeFreezeTimer: freezeTimerSchema.nullable().default(null),
  onboardingVersion: z.number().int().nonnegative().default(0),
  creamyHelperEnabled: z.boolean().default(true),
  creamyPosition: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  tutorialPintVisible: z.boolean().default(true),
  tutorialDraft: tutorialDraftSchema.default({
    version: 3,
    flowVersion: 0,
    stage: 'machine',
    machineId: 'nc501',
    baseItems: [],
    selectedIngredientIds: [],
    itemAmounts: {},
    manualAmountIds: [],
    mixInId: null,
    textureResult: null,
    finalTextureResult: null,
    spinMinutes: 2,
    photoUri: '',
    recipeId: '',
    recipeName: '',
    dietaryPreferences: [],
    disclosures: [],
    freezeTimerStartedAt: null,
  }),
});

export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type DisplayUnit = z.infer<typeof displayUnitSchema>;
export type MeasurementMode = z.infer<typeof measurementModeSchema>;
export type RecipeStyle = z.infer<typeof recipeStyleSchema>;
type ParsedNutrition = z.infer<typeof nutritionSchema>;
export type Nutrition = Omit<ParsedNutrition, 'addedSugar'> & { addedSugar?: number };
type ParsedIngredient = z.infer<typeof ingredientSchema>;
type IngredientMetadataKey = 'brand' | 'description' | 'referenceLabel' | 'sourceUrl' | 'sourceCheckedAt' | 'popularityRank' | 'tags' | 'typicalUses' | 'substitutions' | 'cautions';
// New catalog metadata stays optional to callers; persistence fills defaults on parse.
export type Ingredient = Omit<ParsedIngredient, IngredientMetadataKey | 'nutrition'> & Partial<Pick<ParsedIngredient, IngredientMetadataKey>> & { nutrition: Nutrition };
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type BuilderMode = 'guided' | 'quick';
export type GuidedBuilderDraft = NonNullable<UserSettings['guidedBuilderDraft']>;
export type FreezeTimer = z.infer<typeof freezeTimerSchema>;
export type TutorialDraft = z.infer<typeof tutorialDraftSchema>;
export type TutorialStage = z.infer<typeof tutorialStageSchema>;
export type TutorialTextureResult = z.infer<typeof tutorialTextureResultSchema>;
export type TexturePreference = z.infer<typeof texturePreferenceSchema>;
export type RecipeGoal = z.infer<typeof recipeGoalSchema>;
export type BeginnerFlavor = z.infer<typeof beginnerFlavorSchema>;
export type BeginnerBuilderAnswers = z.infer<typeof beginnerBuilderAnswersSchema>;
export type BeginnerBuilderStage = z.infer<typeof beginnerBuilderStageSchema>;
export type SubstitutionProposal = {
  original: RecipeIngredient;
  replacement: RecipeIngredient;
  rationale: string;
  calorieDelta: number;
  proteinDelta: number;
  fillDeltaMl: number;
};

export const builderPreferencesSchema = z.object({
  style: recipeStyleSchema,
  flavor: z.string().default('anything'),
  craving: z.string().default(''),
});

export const pantryStatusSchema = z.enum(['have', 'need', 'optional']);

export type BuilderPreferences = z.infer<typeof builderPreferencesSchema>;
export type PantryStatus = z.infer<typeof pantryStatusSchema>;

export type GuidedRecommendation = {
  suggestedItems: RecipeIngredient[];
  available: Ingredient[];
  missing: Ingredient[];
  optional: Ingredient[];
  rationale: string;
  warnings: string[];
};

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
