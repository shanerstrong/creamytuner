export const SAFE_FILL_RATIO = 0.92;
export const NEAR_FILL_RATIO = 0.8;

export type PintFillStatus = 'empty' | 'good' | 'near-limit' | 'overflow';

export type PintFillState = {
  amountMl: number;
  capacityMl: number;
  safeLimitMl: number;
  percent: number;
  visualPercent: number;
  overflowPercent: number;
  status: PintFillStatus;
  title: string;
  guidance: string;
};

export function getPintFillState(estimatedVolumeMl: number, machineCapacityMl: number): PintFillState {
  const amountMl = Number.isFinite(estimatedVolumeMl) ? Math.max(0, Math.round(estimatedVolumeMl)) : 0;
  const capacityMl = Number.isFinite(machineCapacityMl) && machineCapacityMl > 0 ? Math.round(machineCapacityMl) : 1;
  const ratio = amountMl / capacityMl;
  const percent = Math.max(0, Math.round(ratio * 100));
  const status: PintFillStatus = amountMl === 0 ? 'empty' : ratio > SAFE_FILL_RATIO ? 'overflow' : ratio > NEAR_FILL_RATIO ? 'near-limit' : 'good';
  const copy = status === 'overflow'
    ? { title: 'Over the MAX line', guidance: 'Remove a little before saving this recipe.' }
    : status === 'near-limit'
      ? { title: 'Getting close', guidance: 'You are still under the MAX line.' }
      : status === 'empty'
        ? { title: 'Your pint is empty', guidance: 'It will fill as ingredients are added.' }
        : { title: 'Fill level looks good', guidance: 'There is room below the MAX line.' };

  return {
    amountMl,
    capacityMl,
    safeLimitMl: Math.floor(capacityMl * SAFE_FILL_RATIO),
    percent,
    visualPercent: Math.min(100, percent),
    overflowPercent: Math.max(0, percent - Math.round(SAFE_FILL_RATIO * 100)),
    status,
    ...copy,
  };
}
