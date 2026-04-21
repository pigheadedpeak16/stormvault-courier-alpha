import assert from "node:assert/strict";
import { GameController } from "./GameController.ts";
import {
  getEnemyPointDropAmount,
  getEnemyPressureProfile,
  getPermanentUpgradeCost
} from "./progressionBalance.ts";
import { PERMANENT_UPGRADE_KEYS, SYSTEM_STAT_KEYS } from "./types.ts";

function withMockedRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function setSummary(
  controller: GameController,
  summary: Partial<{
    fullReset: boolean;
    jumpReady: boolean;
  }>
): void {
  (controller as unknown as { summary: unknown }).summary = summary;
}

function setShipsRemaining(controller: GameController, shipsRemaining: number): void {
  (controller as unknown as { meta: { shipsRemaining: number } }).meta.shipsRemaining = shipsRemaining;
}

function setCredits(controller: GameController, credits: number): void {
  (controller as unknown as { meta: { credits: number } }).meta.credits = credits;
}

function setSystemStatLevel(controller: GameController, key: (typeof SYSTEM_STAT_KEYS)[number], level: number): void {
  (controller as unknown as { meta: { systemBuild: { stats: Record<string, number> } } }).meta.systemBuild.stats[key] = level;
}

function purchaseCruiseThrusters(controller: GameController, purchases: number): void {
  setSummary(controller, { fullReset: false, jumpReady: false });

  for (let level = 0; level < purchases; level += 1) {
    setCredits(controller, getPermanentUpgradeCost("cruiseThrusters", level));
    assert.strictEqual(
      controller.purchaseUpgrade("cruiseThrusters"),
      true,
      `Cruise thrusters purchase ${level + 1} should succeed through the normal purchase flow.`
    );
  }
}

assert.strictEqual(getPermanentUpgradeCost("scanSuite", 0), 180);
assert.strictEqual(getPermanentUpgradeCost("cruiseThrusters", 0), 260);
assert.strictEqual(getPermanentUpgradeCost("classMatrix", 0), 900);
assert.strictEqual(getPermanentUpgradeCost("classMatrix", 1), 1800);

assert.strictEqual(
  JSON.stringify(SYSTEM_STAT_KEYS),
  JSON.stringify(["healthRegen", "maxHealth", "bodyDamage", "bulletSpeed", "bulletPenetration", "bulletDamage", "reload"])
);
assert.strictEqual(
  JSON.stringify(PERMANENT_UPGRADE_KEYS),
  JSON.stringify([
    "scanSuite",
    "harvesterRig",
    "orbAppraisal",
    "insuranceCore",
    "massStabilizers",
    "cruiseThrusters",
    "prospectingArray",
    "classMatrix"
  ])
);

assert.strictEqual(withMockedRandom(0.99, () => getEnemyPointDropAmount("drone")), 0);
assert.strictEqual(withMockedRandom(0.04, () => getEnemyPointDropAmount("drone")), 1);
assert.strictEqual(withMockedRandom(0.0401, () => getEnemyPointDropAmount("drone")), 0);
assert.strictEqual(withMockedRandom(0.34, () => getEnemyPointDropAmount("carrier")), 2);
assert.strictEqual(withMockedRandom(0.3401, () => getEnemyPointDropAmount("carrier")), 1);
assert.strictEqual(withMockedRandom(0.1, () => getEnemyPointDropAmount("siege")), 1);
assert.strictEqual(withMockedRandom(0.1001, () => getEnemyPointDropAmount("siege")), 0);

const baselineController = new GameController();
assert.strictEqual(
  baselineController.getSnapshot().menu.screen,
  "title",
  "The initial controller snapshot should open on the title menu."
);
const baselineCruiseSpeed = baselineController.getSnapshot().cruiseSpeed;
purchaseCruiseThrusters(baselineController, 3);
assert.ok(
  baselineController.getSnapshot().cruiseSpeed > baselineCruiseSpeed,
  "Cruise speed snapshot should increase when cruise thrusters are bought."
);

const enemyHpBaselineController = new GameController();
enemyHpBaselineController.startGameFromMenu();
setSystemStatLevel(enemyHpBaselineController, "bulletDamage", 0);
(enemyHpBaselineController as unknown as { run: { spawnTimer: number } }).run.spawnTimer = 0;
withMockedRandom(0.1, () =>
  enemyHpBaselineController.update(0, {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    shootHeld: false,
    interactPressed: false,
    scanPressed: false
  })
);
const spawnedEnemyHpBaseline = enemyHpBaselineController.getSnapshot().run.enemies[0]?.hp;
assert.ok(typeof spawnedEnemyHpBaseline === "number");

const enemyHpUpgradedController = new GameController();
enemyHpUpgradedController.startGameFromMenu();
setSystemStatLevel(enemyHpUpgradedController, "bulletDamage", 7);
(enemyHpUpgradedController as unknown as { run: { spawnTimer: number } }).run.spawnTimer = 0;
withMockedRandom(0.1, () =>
  enemyHpUpgradedController.update(0, {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    shootHeld: false,
    interactPressed: false,
    scanPressed: false
  })
);
const spawnedEnemyHpUpgraded = enemyHpUpgradedController.getSnapshot().run.enemies[0]?.hp;
assert.ok(typeof spawnedEnemyHpUpgraded === "number");
assert.strictEqual(
  spawnedEnemyHpUpgraded,
  spawnedEnemyHpBaseline,
  "Bullet damage should not raise the baseline HP of spawned enemies."
);

const menuController = new GameController();
menuController.openMenu("tier3");
assert.strictEqual(
  menuController.getSnapshot().menu.screen,
  "tier3",
  "Opening the Tier 3 placeholder menu should update the menu snapshot state."
);

const normalNextRunController = new GameController();
purchaseCruiseThrusters(normalNextRunController, 2);
setSummary(normalNextRunController, { fullReset: false, jumpReady: false });
normalNextRunController.startNextRun();
assert.strictEqual(
  normalNextRunController.getSnapshot().meta.permanentUpgrades.cruiseThrusters,
  2,
  "Cruise thrusters should persist into the next normal run."
);

const systemJumpController = new GameController();
purchaseCruiseThrusters(systemJumpController, 4);
setSummary(systemJumpController, { fullReset: false, jumpReady: true });
systemJumpController.startNextRun();
assert.strictEqual(
  systemJumpController.getSnapshot().meta.permanentUpgrades.cruiseThrusters,
  4,
  "Cruise thrusters should persist through a system jump reset."
);
assert.strictEqual(
  systemJumpController.getSnapshot().meta.systemBuild.stats.reload,
  0,
  "System-jump resets should still rebuild the per-system stat sheet."
);

const fleetResetController = new GameController();
purchaseCruiseThrusters(fleetResetController, 5);
setShipsRemaining(fleetResetController, 1);
(fleetResetController as unknown as { handleRunLoss: (outcome: "destroyed" | "storm") => void }).handleRunLoss("destroyed");
assert.strictEqual(
  fleetResetController.getSnapshot().meta.permanentUpgrades.cruiseThrusters,
  0,
  "Full fleet reset currently wipes permanent upgrades back to the default meta baseline."
);

const early = getEnemyPressureProfile({
  timeLeft: 240,
  duration: 300,
  distancePressure: 0,
  wave: 2
});
const finalMinute = getEnemyPressureProfile({
  timeLeft: 45,
  duration: 300,
  distancePressure: 1,
  wave: 5
});
const panic = getEnemyPressureProfile({
  timeLeft: 15,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const preFinalMinute = getEnemyPressureProfile({
  timeLeft: 61,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const atFinalMinute = getEnemyPressureProfile({
  timeLeft: 60,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const postFinalMinute = getEnemyPressureProfile({
  timeLeft: 59,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const prePanic = getEnemyPressureProfile({
  timeLeft: 31,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const atPanic = getEnemyPressureProfile({
  timeLeft: 30,
  duration: 300,
  distancePressure: 2,
  wave: 7
});
const postPanic = getEnemyPressureProfile({
  timeLeft: 29,
  duration: 300,
  distancePressure: 2,
  wave: 7
});

assert.ok(finalMinute.maxEnemies >= early.maxEnemies + 18);
assert.ok(finalMinute.spawnBurst >= 4);
assert.ok(finalMinute.spawnIntervalMax < early.spawnIntervalMax);
assert.ok(panic.maxEnemies >= 72);
assert.ok(panic.spawnBurst >= 8);
assert.ok(panic.spawnIntervalMin <= 0.03);
assert.ok(panic.spawnIntervalMax <= 0.18);
assert.ok(atFinalMinute.maxEnemies - preFinalMinute.maxEnemies <= 2);
assert.ok(postFinalMinute.maxEnemies - atFinalMinute.maxEnemies <= 2);
assert.ok(atPanic.maxEnemies - prePanic.maxEnemies <= 2);
assert.ok(postPanic.maxEnemies - atPanic.maxEnemies <= 2);
assert.ok(atFinalMinute.spawnBurst - preFinalMinute.spawnBurst <= 1);
assert.ok(postFinalMinute.spawnBurst - atFinalMinute.spawnBurst <= 1);
assert.ok(atPanic.spawnBurst - prePanic.spawnBurst <= 1);
assert.ok(postPanic.spawnBurst - atPanic.spawnBurst <= 1);
assert.ok(preFinalMinute.spawnIntervalMin - atFinalMinute.spawnIntervalMin <= 0.03);
assert.ok(atFinalMinute.spawnIntervalMin - postFinalMinute.spawnIntervalMin <= 0.03);
assert.ok(prePanic.spawnIntervalMin - atPanic.spawnIntervalMin <= 0.02);
assert.ok(atPanic.spawnIntervalMin - postPanic.spawnIntervalMin <= 0.02);
assert.ok(preFinalMinute.spawnIntervalMax - atFinalMinute.spawnIntervalMax <= 0.08);
assert.ok(atFinalMinute.spawnIntervalMax - postFinalMinute.spawnIntervalMax <= 0.08);
assert.ok(prePanic.spawnIntervalMax - atPanic.spawnIntervalMax <= 0.08);
assert.ok(atPanic.spawnIntervalMax - postPanic.spawnIntervalMax <= 0.08);
