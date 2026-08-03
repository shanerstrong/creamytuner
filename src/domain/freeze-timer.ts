import type { FreezeTimer, Recipe } from '@/src/types';

export const FREEZE_DURATION_MS = 24 * 60 * 60 * 1000;

export function createFreezeTimer(recipe: Pick<Recipe, 'id' | 'name'>, now = Date.now()): FreezeTimer {
  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + FREEZE_DURATION_MS).toISOString(),
    notificationScheduled: false,
  };
}

export function getFreezeTimerRemainingMs(timer: FreezeTimer, now = Date.now()) {
  const end = Date.parse(timer.endsAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now);
}

export function isFreezeTimerReady(timer: FreezeTimer, now = Date.now()) {
  return getFreezeTimerRemainingMs(timer, now) === 0;
}

export function formatFreezeTimerRemaining(timer: FreezeTimer, now = Date.now()) {
  const remaining = getFreezeTimerRemainingMs(timer, now);
  if (remaining <= 0) return 'Ready to spin';
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m remaining`;
}

export function formatFreezeReadyTime(timer: FreezeTimer) {
  const date = new Date(timer.endsAt);
  if (!Number.isFinite(date.getTime())) return 'Ready after 24 hours';
  return `Ready ${date.toLocaleDateString(undefined, { weekday: 'short' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}
