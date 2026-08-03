import { estimateVolumeMl } from '@/src/domain/nutrition';
import type { Ingredient, Recipe, RecipeIngredient, TutorialDraft, TutorialTextureResult } from '@/src/types';

export const CURRENT_ONBOARDING_VERSION = 5;
export const TUTORIAL_STAGES = ['machine', 'dietary', 'base', 'helper', 'sweetener', 'flavor', 'blend', 'freeze', 'first-spin', 'evaluate', 'second-cycle-additions', 'second-cycle', 'final-check', 'complete'] as const;
export const TUTORIAL_STEP_COUNT = TUTORIAL_STAGES.length;

export type TutorialBaseTemplate = {
  id: 'balanced' | 'protein' | 'dairy-free';
  title: string;
  detail: string;
  items: RecipeIngredient[];
};

export type TutorialRecommendation = {
  ingredientId: string;
  amount: number;
  reason: string;
};

export function normalizeTutorialDraft(draft: TutorialDraft): TutorialDraft {
  return {
    ...draft,
    version: 3,
    baseItems: draft.baseItems.map((item) => ({ ...item })),
    selectedIngredientIds: [...new Set(draft.selectedIngredientIds)],
    disclosures: [...new Set(draft.disclosures)],
    dietaryPreferences: [...new Set(draft.dietaryPreferences)],
    mixInIds: [...new Set(draft.mixInIds.length ? draft.mixInIds : draft.mixInId ? [draft.mixInId] : [])],
    correctiveIngredientIds: [...new Set(draft.correctiveIngredientIds)],
  };
}

export function tutorialBaseTemplates(capacityMl: number): TutorialBaseTemplate[] {
  const pool = Math.min(400, Math.floor(capacityMl * 0.58));
  const split = (firstId: string, firstRatio: number, secondId: string): RecipeIngredient[] => {
    const first = Math.round(pool * firstRatio);
    return [
      { ingredientId: firstId, amount: first, unit: 'ml' },
      { ingredientId: secondId, amount: pool - first, unit: 'ml' },
    ];
  };
  return [
    { id: 'balanced', title: 'Balanced and light', detail: 'Our easiest mixed base. Familiar dairy creaminess without feeling heavy.', items: split('milk-2', 0.25, 'almond-milk') },
    { id: 'protein', title: 'Protein-forward', detail: 'A creamy milk blend with more protein before powder is added.', items: split('fairlife-2', 0.75, 'milk-2') },
    { id: 'dairy-free', title: 'Dairy-free creamy', detail: 'Soy adds body while almond milk keeps the base lighter.', items: split('soy-milk', 0.65, 'almond-milk') },
  ];
}

export function tutorialRecommendation(draft: TutorialDraft, ingredients: Ingredient[], step: 'protein' | 'helper' | 'sweetener' | 'flavor'): TutorialRecommendation | null {
  const normalized = normalizeTutorialDraft(draft);
  const baseTotal = normalized.baseItems.reduce((sum, item) => sum + item.amount, 0);
  const plantTotal = normalized.baseItems.reduce((sum, item) => item.ingredientId === 'almond-milk' || item.ingredientId === 'soy-milk' ? sum + item.amount : sum, 0);
  const plantHeavy = baseTotal > 0 && plantTotal / baseTotal >= 0.5;
  const id = step === 'protein' ? 'whey-vanilla' : step === 'helper' ? (plantHeavy || normalized.dietaryPreferences.includes('vegan') ? 'xanthan-gum' : 'jello-vanilla-zero') : step === 'sweetener' ? (normalized.dietaryPreferences.includes('no-added-sugar') ? 'monk-fruit' : 'sugar') : 'strawberries';
  const ingredient = ingredients.find((candidate) => candidate.id === id);
  if (!ingredient) return null;
  const reason = step === 'protein'
    ? 'One measured scoop adds protein and milk solids that support a creamier texture.'
    : step === 'helper'
      ? plantHeavy ? 'A very small amount helps a plant-heavy base hold together.' : 'Pudding mix is a forgiving beginner option for body and flavor.'
      : step === 'sweetener'
        ? normalized.dietaryPreferences.includes('no-added-sugar') ? 'Monk fruit adds sweetness without added sugar.' : 'Sugar is the familiar starting point and helps keep the pint scoopable.'
        : 'Strawberry is a forgiving first flavor and blends smoothly into the base.';
  return { ingredientId: ingredient.id, amount: ingredient.defaultAmount, reason };
}

export function tutorialItems(draft: TutorialDraft, ingredients: Ingredient[]): RecipeIngredient[] {
  const normalized = normalizeTutorialDraft(draft);
  const selected = normalized.selectedIngredientIds;
  const items: RecipeIngredient[] = normalized.baseItems.map((item) => ({ ...item }));
  for (const id of selected) {
    if (!id) continue;
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (ingredient) items.push({ ingredientId: ingredient.id, amount: normalized.itemAmounts[ingredient.id] ?? ingredient.defaultAmount, unit: ingredient.defaultUnit });
  }
  return items.filter((item) => ingredients.some((ingredient) => ingredient.id === item.ingredientId));
}

export function fitTutorialBaseAmount(draft: TutorialDraft, ingredients: Ingredient[], capacityMl: number) {
  const baseIds = new Set(draft.baseItems.map((item) => item.ingredientId));
  const nonBase = tutorialItems(draft, ingredients).filter((item) => !baseIds.has(item.ingredientId));
  return Math.max(60, Math.floor(capacityMl * 0.88 - estimateVolumeMl(nonBase)));
}

export function fitTutorialBaseItems(draft: TutorialDraft, ingredients: Ingredient[], capacityMl: number): RecipeIngredient[] {
  const normalized = normalizeTutorialDraft(draft);
  if (!normalized.baseItems.length) return [];
  const baseIds = new Set(normalized.baseItems.map((item) => item.ingredientId));
  const nonBase = tutorialItems({ ...normalized, baseItems: normalized.baseItems.map((item) => ({ ...item, amount: 0.01 })) }, ingredients).filter((item) => !baseIds.has(item.ingredientId));
  const available = Math.max(60, Math.floor(capacityMl * 0.88 - estimateVolumeMl(nonBase)));
  const current = normalized.baseItems.reduce((sum, item) => sum + item.amount, 0);
  if (current <= available) return normalized.baseItems;
  const scale = available / current;
  return normalized.baseItems.map((item, index, all) => ({
    ...item,
    amount: index === all.length - 1
      ? Math.max(1, available - all.slice(0, -1).reduce((sum, base) => sum + Math.max(1, Math.floor(base.amount * scale)), 0))
      : Math.max(1, Math.floor(item.amount * scale)),
  }));
}

export function tutorialRecipePresentation(draft: TutorialDraft): { name: string; imageKey: Recipe['imageKey'] } {
  if (draft.recipeName?.trim()) return { name: draft.recipeName.trim(), imageKey: draft.selectedIngredientIds.includes('cocoa') ? 'chocolate' : 'strawberry' };
  if (draft.selectedIngredientIds.includes('cocoa')) return { name: 'My First Chocolate Pint', imageKey: 'chocolate' };
  if (draft.selectedIngredientIds.includes('banana')) return { name: 'My First Banana Pint', imageKey: 'cookies' };
  if (draft.selectedIngredientIds.includes('vanilla')) return { name: 'My First Vanilla Pint', imageKey: 'cookies' };
  return { name: 'My First Strawberry Pint', imageKey: 'strawberry' };
}

export function tutorialMixInItem(draft: TutorialDraft, ingredients: Ingredient[]): RecipeIngredient | null {
  const id = draft.mixInIds[0] ?? draft.mixInId;
  if (!id) return null;
  const ingredient = ingredients.find((candidate) => candidate.id === id && candidate.category === 'mix-in');
  return ingredient ? { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit } : null;
}

export function tutorialMixInItems(draft: TutorialDraft, ingredients: Ingredient[]): RecipeIngredient[] {
  const ids = draft.mixInIds.length ? draft.mixInIds : draft.mixInId ? [draft.mixInId] : [];
  return ids.map((id) => ingredients.find((candidate) => candidate.id === id && candidate.category === 'mix-in')).filter((ingredient): ingredient is Ingredient => Boolean(ingredient)).map((ingredient) => ({ ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }));
}

export const tutorialTextureGuidance: Record<TutorialTextureResult, { title: string; detail: string; next: string }> = {
  perfect: {
    title: 'Perfect — stop processing',
    detail: 'Scoop it now, or choose Mix-In if you want chunks folded through it.',
    next: 'Optional Mix-In',
  },
  powdery: {
    title: 'Add a small splash',
    detail: 'A powdery first spin is common with very cold or lean bases. Pack it down and add one tablespoon of your base before the final cycle.',
    next: 'Prepare the final cycle',
  },
  chalky: {
    title: 'Add moisture before the final cycle',
    detail: 'Pack the pint down, then add one tablespoon of your base before the final cycle. For the next pint, reduce dry powder if the chalkiness returns.',
    next: 'Prepare the final cycle',
  },
  icy: {
    title: 'Add a small splash',
    detail: 'Pack the surface down and add one tablespoon of your base before the final cycle. Review sweetener and milk solids for the next pint.',
    next: 'Prepare the final cycle',
  },
  'too-soft': {
    title: 'Freeze it longer',
    detail: 'Do not process a melting pint. Return it to the freezer until completely firm and level before the final cycle.',
    next: 'Refreeze before the final cycle',
  },
};
