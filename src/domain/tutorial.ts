import { estimateVolumeMl } from '@/src/domain/nutrition';
import { filterIngredientsForPreferences, getIngredientEligibility } from '@/src/domain/dietary';
import type { Ingredient, Recipe, RecipeIngredient, TutorialDraft, TutorialTextureResult } from '@/src/types';

export const CURRENT_ONBOARDING_VERSION = 6;
export const TUTORIAL_STAGES = ['machine', 'food-needs', 'base', 'taste', 'review', 'freeze', 'first-cycle', 'final-cycle', 'complete'] as const;
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

const helperRecommendationIds = ['jello-vanilla-zero', 'xanthan-gum', 'cottage-cheese-low-fat', 'cream-cheese', 'guar-gum', 'greek-yogurt'];
const sweetenerRecommendationIds = ['sugar', 'brown-sugar', 'allulose', 'stevia', 'erythritol', 'monk-fruit'];
const flavorRecommendationIds = ['strawberries', 'cocoa', 'vanilla', 'banana', 'blueberries', 'pb2-original'];

export function normalizeTutorialDraft(draft: TutorialDraft): TutorialDraft {
  return {
    ...draft,
    version: 5,
    baseItems: draft.baseItems.map((item) => ({ ...item })),
    selectedIngredientIds: [...new Set(draft.selectedIngredientIds)],
    disclosures: [...new Set(draft.disclosures)],
    dietaryPreferences: [...new Set(draft.dietaryPreferences)],
    foodAllergies: [...new Set(draft.foodAllergies)],
    customAvoidFoods: [...new Set(draft.customAvoidFoods.map((value) => value.trim()).filter(Boolean))],
    mixInIds: [...new Set(draft.mixInIds.length ? draft.mixInIds : draft.mixInId ? [draft.mixInId] : [])],
    correctiveIngredientIds: [...new Set(draft.correctiveIngredientIds)],
    initializedRecommendationStages: [...new Set(draft.initializedRecommendationStages)],
  };
}

export function initializeTutorialStageRecommendations(source: TutorialDraft, ingredients: Ingredient[], capacityMl: number, stage = source.stage): TutorialDraft {
  const draft = normalizeTutorialDraft(source);
  if ((stage !== 'base' && stage !== 'taste') || draft.initializedRecommendationStages.includes(stage)) return draft;
  const eligible = filterIngredientsForPreferences(ingredients, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods);
  const eligibleIds = new Set(eligible.map((ingredient) => ingredient.id));
  const selectedIngredientIds = [...draft.selectedIngredientIds];
  const itemAmounts = { ...draft.itemAmounts };
  let baseItems = draft.baseItems.map((item) => ({ ...item }));

  if (stage === 'base') {
    if (!baseItems.length) {
      const templateIndex = draft.dietaryPreferences.includes('vegan') || draft.dietaryPreferences.includes('dairy-free') ? 2 : draft.dietaryPreferences.includes('high-protein') ? 1 : 0;
      const template = tutorialBaseTemplates(capacityMl)[templateIndex];
      const total = template.items.reduce((sum, item) => sum + item.amount, 0);
      const allowed = template.items.filter((item) => eligibleIds.has(item.ingredientId));
      const fallback = eligible.find((ingredient) => ingredient.category === 'base' && ingredient.defaultUnit === 'ml');
      baseItems = allowed.length
        ? allowed.map((item, index) => ({ ...item, amount: index === allowed.length - 1 ? total - allowed.slice(0, -1).reduce((sum, value) => sum + value.amount, 0) : item.amount }))
        : fallback ? [{ ingredientId: fallback.id, amount: total, unit: 'ml' }] : [];
    }
    if (!helperRecommendationIds.some((id) => selectedIngredientIds.includes(id))) {
      const plantOnly = draft.dietaryPreferences.includes('dairy-free') || draft.dietaryPreferences.includes('vegan');
      const helperId = [plantOnly ? 'xanthan-gum' : 'jello-vanilla-zero', 'xanthan-gum', ...helperRecommendationIds].find((id) => eligibleIds.has(id));
      const helper = helperId ? ingredients.find((ingredient) => ingredient.id === helperId) : undefined;
      if (helper) {
        selectedIngredientIds.push(helper.id);
        itemAmounts[helper.id] = helper.defaultAmount;
      }
    }
  }

  if (stage === 'taste') {
    if (!sweetenerRecommendationIds.some((id) => selectedIngredientIds.includes(id))) {
      const preferred = draft.dietaryPreferences.includes('no-added-sugar') ? 'monk-fruit' : 'sugar';
      const sweetenerId = [preferred, ...sweetenerRecommendationIds].find((id) => eligibleIds.has(id));
      const sweetener = sweetenerId ? ingredients.find((ingredient) => ingredient.id === sweetenerId) : undefined;
      if (sweetener) {
        selectedIngredientIds.push(sweetener.id);
        itemAmounts[sweetener.id] = sweetener.defaultAmount;
      }
    }
    if (!flavorRecommendationIds.some((id) => selectedIngredientIds.includes(id))) {
      const flavorId = ['strawberries', ...flavorRecommendationIds].find((id) => eligibleIds.has(id));
      const flavor = flavorId ? ingredients.find((ingredient) => ingredient.id === flavorId) : undefined;
      if (flavor) {
        selectedIngredientIds.push(flavor.id);
        itemAmounts[flavor.id] = flavor.defaultAmount;
      }
    }
  }

  return {
    ...draft,
    stage,
    baseItems,
    selectedIngredientIds: [...new Set(selectedIngredientIds)],
    itemAmounts,
    initializedRecommendationStages: [...new Set([...draft.initializedRecommendationStages, stage])],
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
  if (!ingredient || !getIngredientEligibility(ingredient, normalized.dietaryPreferences, normalized.foodAllergies, normalized.customAvoidFoods).allowed) return null;
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

export function tutorialFinalProgram(draft: Pick<TutorialDraft, 'mixInIds' | 'mixInId' | 'textureResult'>): 'mix-in' | 'respin' | null {
  if (draft.mixInIds.length || draft.mixInId) return 'mix-in';
  if (draft.textureResult && draft.textureResult !== 'perfect') return 'respin';
  return null;
}

export const tutorialTextureGuidance: Record<TutorialTextureResult, { title: string; detail: string; next: string; source: 'manufacturer' | 'community' | 'creamytuner' }> = {
  perfect: {
    title: 'Perfect — stop processing',
    detail: 'Scoop it now, or choose Mix-In if you want chunks folded through it.',
    next: 'Optional Mix-In',
    source: 'creamytuner',
  },
  powdery: {
    title: 'Choose one final program',
    detail: 'Use Re-Spin for a powdery result only when you are not adding chunks. If you add mix-ins, use Mix-In instead and do not run both.',
    next: 'Prepare the final cycle',
    source: 'manufacturer',
  },
  chalky: {
    title: 'Pack it down before the final cycle',
    detail: 'If it is genuinely dry, you can confirm one tablespoon of matching base. Use Re-Spin without chunks or Mix-In when adding chunks.',
    next: 'Prepare the final cycle',
    source: 'community',
  },
  icy: {
    title: 'Pack it down before the final cycle',
    detail: 'Use Re-Spin without chunks or Mix-In when adding chunks. Review sweetener and milk solids for the next pint.',
    next: 'Prepare the final cycle',
    source: 'community',
  },
  'too-soft': {
    title: 'Freeze it longer',
    detail: 'Do not process a melting pint. Return it to the freezer until completely firm and level before the final cycle.',
    next: 'Refreeze before the final cycle',
    source: 'manufacturer',
  },
};
