export const ORB_QUOTA_TARGET = 40;
export const MIN_SYSTEM_RUNS = 4;
export const LINEAR_ORB_DRAG = 0.015;
export const CARRY_MULTIPLIER_FLOOR = 0.55;

export function getCarrySpeedMultiplier(orbs: number, stabilizerRank = 0): number {
  const drag = Math.max(0.007, LINEAR_ORB_DRAG - stabilizerRank * 0.0015);
  return Math.max(CARRY_MULTIPLIER_FLOOR, 1 - drag * orbs);
}

export interface SystemJumpReadinessInput {
  deliveredOrbs: number;
  runsInSystem: number;
  orbTarget?: number;
  minimumRuns?: number;
}

export function isSystemJumpReady({
  deliveredOrbs,
  runsInSystem,
  orbTarget = ORB_QUOTA_TARGET,
  minimumRuns = MIN_SYSTEM_RUNS
}: SystemJumpReadinessInput): boolean {
  return deliveredOrbs >= orbTarget && runsInSystem >= minimumRuns;
}
