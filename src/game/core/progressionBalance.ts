import type { EnemyKind, PermanentUpgradeKey } from "./types.ts";

const BASE_UPGRADE_COSTS: Record<PermanentUpgradeKey, number> = {
  scanSuite: 180,
  harvesterRig: 180,
  orbAppraisal: 220,
  insuranceCore: 240,
  massStabilizers: 260,
  cruiseThrusters: 260,
  prospectingArray: 320,
  classMatrix: 900
};

const STRONGER_ENEMY_KINDS = new Set<EnemyKind>([
  "siege",
  "shieldfrigate",
  "missileer",
  "minelayer",
  "jammer",
  "harpoon",
  "cloak"
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getCountdownRamp(timeLeft: number, startTime: number): number {
  return clamp01((startTime - timeLeft) / startTime);
}

export function getPermanentUpgradeCost(key: PermanentUpgradeKey, level: number): number {
  const growth = key === "classMatrix" ? 900 : Math.round(BASE_UPGRADE_COSTS[key] * 0.7);
  return BASE_UPGRADE_COSTS[key] + level * growth;
}

export function getEnemyPointDropAmount(kind: EnemyKind): number {
  if (kind === "carrier") {
    return Math.random() <= 0.34 ? 2 : 1;
  }

  if (STRONGER_ENEMY_KINDS.has(kind)) {
    return Math.random() <= 0.1 ? 1 : 0;
  }

  return Math.random() <= 0.04 ? 1 : 0;
}

export function getEnemyPressureProfile(args: {
  timeLeft: number;
  duration: number;
  distancePressure: number;
  wave: number;
}): {
  maxEnemies: number;
  spawnBurst: number;
  spawnIntervalMin: number;
  spawnIntervalMax: number;
} {
  const timerPressure = 1 - args.timeLeft / args.duration;
  const finalMinutePressure = getCountdownRamp(args.timeLeft, 90);
  const panicPressure = getCountdownRamp(args.timeLeft, 45);

  const maxEnemies = Math.round(
    8 +
    args.wave +
    args.distancePressure * 3 +
    timerPressure * 14 +
    finalMinutePressure * 48 +
    panicPressure * 24
  );

  const spawnBurst = Math.round(1 + timerPressure * 2 + finalMinutePressure * 6 + panicPressure * 3);

  return {
    maxEnemies,
    spawnBurst,
    spawnIntervalMin: Math.max(0.02, 0.4 - finalMinutePressure * 0.32 - panicPressure * 0.18),
    spawnIntervalMax: Math.max(0.08, 2 - timerPressure * 1.15 - finalMinutePressure * 1.55 - panicPressure * 0.75)
  };
}
