import assert from "node:assert/strict";
import {
  CARRY_MULTIPLIER_FLOOR,
  LINEAR_ORB_DRAG,
  MIN_SYSTEM_RUNS,
  ORB_QUOTA_TARGET,
  getCarrySpeedMultiplier,
  isSystemJumpReady
} from "./orbBalance.ts";

assert.strictEqual(ORB_QUOTA_TARGET, 40);
assert.strictEqual(MIN_SYSTEM_RUNS, 4);
assert.strictEqual(getCarrySpeedMultiplier(0), 1);
assert.strictEqual(getCarrySpeedMultiplier(10), 1 - LINEAR_ORB_DRAG * 10);
assert.strictEqual(getCarrySpeedMultiplier(20), 1 - LINEAR_ORB_DRAG * 20);
assert.strictEqual(getCarrySpeedMultiplier(40), CARRY_MULTIPLIER_FLOOR);
assert.strictEqual(getCarrySpeedMultiplier(80), CARRY_MULTIPLIER_FLOOR);
assert.ok(CARRY_MULTIPLIER_FLOOR <= getCarrySpeedMultiplier(10));
assert.strictEqual(getCarrySpeedMultiplier(10, 2), 1 - (LINEAR_ORB_DRAG - 0.003) * 10);
assert.strictEqual(isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 4 }), true);
assert.strictEqual(isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 3 }), false);
assert.strictEqual(isSystemJumpReady({ deliveredOrbs: 39, runsInSystem: 4 }), false);
assert.strictEqual(isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 4, orbTarget: 40, minimumRuns: 4 }), true);
assert.strictEqual(isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 4, orbTarget: 54, minimumRuns: 4 }), false);
