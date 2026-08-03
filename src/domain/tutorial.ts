import { estimateVolumeMl } from '@/src/domain/nutrition';
import type { Ingredient, Recipe, RecipeIngredient, TutorialDraft, TutorialTextureResult } from '@/src/types';

export const CURRENT_ONBOARDING_VERSION = 3;
export const TUTORIAL_STEP_COUNT = 11;

export function tutorialItems(draft: TutorialDraft, ingredients: Ingredient[]): RecipeIngredient[] {
  const selected: (string | null)[] = [draft.proteinId, draft.helperId, draft.sweetenerId, draft.flavorId];
  const items: RecipeIngredient[] = draft.baseAdded ? [{ ingredientId: draft.baseId, amount: draft.baseAmountMl, unit: 'ml' }] : [];
  for (const id of selected) {
    if (!id) continue;
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (ingredient) items.push({ ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit });
  }
  return items.filter((item) => ingredients.some((ingredient) => ingredient.id === item.ingredientId));
}

export function fitTutorialBaseAmount(draft: TutorialDraft, ingredients: Ingredient[], capacityMl: number) {
  const nonBase = tutorialItems({ ...draft, baseAmountMl: 1 }, ingredients).filter((item) => item.ingredientId !== draft.baseId);
  return Math.max(60, Math.floor(capacityMl * 0.88 - estimateVolumeMl(nonBase)));
}

export function clampCreamyPosition(position: { x: number; y: number }, viewportWidth: number, viewportHeight: number) {
  return {
    x: Math.min(0, Math.max(-(Math.max(0, viewportWidth - 148)), Math.round(position.x))),
    y: Math.min(48, Math.max(-(Math.max(0, viewportHeight - 300)), Math.round(position.y))),
  };
}

export function tutorialRecipePresentation(draft: TutorialDraft): { name: string; imageKey: Recipe['imageKey'] } {
  if (draft.flavorId === 'cocoa') return { name: 'My First Chocolate Pint', imageKey: 'chocolate' };
  if (draft.flavorId === 'banana') return { name: 'My First Banana Pint', imageKey: 'cookies' };
  if (draft.flavorId === 'vanilla') return { name: 'My First Vanilla Pint', imageKey: 'cookies' };
  return { name: 'My First Strawberry Pint', imageKey: 'strawberry' };
}

export function tutorialMixInItem(draft: TutorialDraft, ingredients: Ingredient[]): RecipeIngredient | null {
  if (!draft.mixInId) return null;
  const ingredient = ingredients.find((candidate) => candidate.id === draft.mixInId && candidate.category === 'mix-in');
  return ingredient ? { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit } : null;
}

export const tutorialTextureGuidance: Record<TutorialTextureResult, { title: string; detail: string; next: string }> = {
  perfect: {
    title: 'Perfect — stop processing',
    detail: 'Scoop it now, or choose Mix-In if you want chunks folded through it.',
    next: 'Optional Mix-In',
  },
  powdery: {
    title: 'Pack it down and Re-Spin',
    detail: 'A powdery first spin is common with very cold or lean bases. Re-Spin once before adding liquid.',
    next: 'Re-Spin',
  },
  chalky: {
    title: 'Re-Spin, then adjust next time',
    detail: 'Pack the pint down with a spoon or silicone spatula. If it stays chalky, reduce dry powder or add more body in the next recipe.',
    next: 'Re-Spin',
  },
  icy: {
    title: 'Re-Spin and review the base',
    detail: 'Re-Spin once. For the next pint, review sweetener, milk solids, and stabilizer instead of repeatedly adding liquid.',
    next: 'Re-Spin',
  },
  'too-soft': {
    title: 'Freeze it longer',
    detail: 'Do not Re-Spin a melting pint. Return it to the freezer until firm and make sure it froze level.',
    next: 'Back to freezer',
  },
};
