# Orb Economy Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Stormvault Courier so system progression uses raw delivered orb count plus a four-run minimum, remove heat and carry-cap systems entirely, and rebalance distance-based orb value so risky deep runs generate better upgrade credits without shortening system exposure.

**Architecture:** Keep the existing Phaser scene and HUD structure, but move the new quota, carry-weight, and solar-system pacing rules into small pure helpers so the giant `GameController` does less inline math. Update `createRunState.ts`, `GameController.ts`, `main.ts`, and `style.css` to remove heat, remove cargo-cap assumptions, and surface the new orb economy cleanly in the HUD and overlay.

**Tech Stack:** TypeScript, Phaser 3, Vite, CSS, existing `npm run build` verification flow

---

## File Map

- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\types.ts`
  - remove heat-related state and rename meta quota fields to orb-centric names
- Create: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\orbBalance.ts`
  - pure helpers for quota target, run requirement, linear carry slowdown, and system jump readiness
- Create: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\orbBalance.spec.ts`
  - focused compile-checked examples and assertions for the pure helper math
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\createRunState.ts`
  - shorten run duration to 120 seconds, remove heat defaults, adjust opening text, and seed safer early orb nodes
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\GameController.ts`
  - integrate orb quota logic, remove heat/coolant behavior, remove carry-cap enforcement, apply linear move-speed drag from orb count, rebalance node value scaling farther from the ship, and make the first four runs expose the whole local enemy pool
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\main.ts`
  - remove heat HUD, rename labels to orb language, show system runs as a plain count, and keep summary values separated into orbs vs credits
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\style.css`
  - shrink the top-left HUD after heat removal and keep the overlay layout stable
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\scenes\GameScene.ts`
  - remove any heat-tied rendering assumptions and keep orb labels/effects readable with the updated HUD

### Task 1: Add Pure Orb Progression Helpers

**Files:**
- Create: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\orbBalance.ts`
- Create: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\orbBalance.spec.ts`
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\types.ts`

- [ ] **Step 1: Write the failing spec examples for quota and carry math**

```ts
// src/game/core/orbBalance.spec.ts
import assert from "node:assert/strict";
import {
  LINEAR_ORB_DRAG,
  MIN_SYSTEM_RUNS,
  ORB_QUOTA_TARGET,
  getCarrySpeedMultiplier,
  isSystemJumpReady
} from "./orbBalance";

assert.equal(ORB_QUOTA_TARGET, 40);
assert.equal(MIN_SYSTEM_RUNS, 4);
assert.equal(getCarrySpeedMultiplier(0), 1);
assert.equal(getCarrySpeedMultiplier(10), 1 - LINEAR_ORB_DRAG * 10);
assert.equal(
  isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 4 }),
  true
);
assert.equal(
  isSystemJumpReady({ deliveredOrbs: 40, runsInSystem: 3 }),
  false
);
assert.equal(
  isSystemJumpReady({ deliveredOrbs: 39, runsInSystem: 4 }),
  false
);
```

- [ ] **Step 2: Run the build to verify the new spec file fails because the helper module does not exist yet**

Run: `npm run build`

Expected: TypeScript failure mentioning `./orbBalance` cannot be found from `src/game/core/orbBalance.spec.ts`

- [ ] **Step 3: Add the minimal helper module and orb-centric type updates**

```ts
// src/game/core/orbBalance.ts
export const ORB_QUOTA_TARGET = 40;
export const MIN_SYSTEM_RUNS = 4;
export const LINEAR_ORB_DRAG = 0.0125;
export const MIN_CARRY_MULTIPLIER = 0.42;

export function getCarrySpeedMultiplier(orbsCarried: number): number {
  return Math.max(MIN_CARRY_MULTIPLIER, 1 - Math.max(0, orbsCarried) * LINEAR_ORB_DRAG);
}

export function isSystemJumpReady(input: { deliveredOrbs: number; runsInSystem: number }): boolean {
  return input.deliveredOrbs >= ORB_QUOTA_TARGET && input.runsInSystem >= MIN_SYSTEM_RUNS;
}
```

```ts
// src/game/core/types.ts
export interface MetaState {
  credits: number;
  runNumber: number;
  bestTake: number;
  shipsRemaining: number;
  systemIndex: number;
  runsInSystem: number;
  deliveredOrbs: number;
  upgrades: Record<UpgradeKey, number>;
}

export interface PlayerState extends Vector2 {
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hull: number;
  maxHull: number;
  cargo: number;
  cargoValue: number;
  invulnTimer: number;
  scanCooldown: number;
  fireCooldown: number;
  harvestingNodeId: number | null;
  harvestTimer: number;
  harvestDurationTotal: number;
}
```

- [ ] **Step 4: Run the build to verify the helper math compiles**

Run: `npm run build`

Expected: build still fails, but only on later integration points that still reference removed heat fields or old quota names

- [ ] **Step 5: Commit**

```bash
git add src/game/core/types.ts src/game/core/orbBalance.ts src/game/core/orbBalance.spec.ts
git commit -m "refactor: add orb progression helpers"
```

### Task 2: Rewire Run State, Upgrades, and Quota Logic

**Files:**
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\createRunState.ts`
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\GameController.ts`
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\types.ts`
- Use: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\orbBalance.ts`

- [ ] **Step 1: Remove the two deprecated upgrades from the upgrade definition list**

```ts
// src/game/core/GameController.ts
const UPGRADE_DEFS: UpgradeDefinition[] = [
  {
    key: "scanner",
    label: "Deep Scan Array",
    description: "Longer scan radius and faster scan recovery."
  },
  {
    key: "thrusters",
    label: "Storm Thrusters",
    description: "Higher cruise speed while hauling heavier orb loads."
  },
  {
    key: "shield",
    label: "Arc Shielding",
    description: "Higher hull and a better insurance payout when runs go bad."
  },
  {
    key: "damage",
    label: "Pulse Amplifier",
    description: "Higher shot damage without raising fire cadence."
  },
  {
    key: "cadence",
    label: "Rapid Cycle Rail",
    description: "Faster firing cadence without raising shot damage."
  },
  {
    key: "salvage",
    label: "Salvage AI",
    description: "Better cache payouts from higher-tier orb colors."
  },
  {
    key: "plating",
    label: "Reactive Plating",
    description: "Cuts incoming impact and projectile damage."
  }
];
```

- [ ] **Step 2: Run the build to confirm upgrade-key mismatches fail before the rest of the refactor**

Run: `npm run build`

Expected: TypeScript failure around `UpgradeKey` and `meta.upgrades` still containing removed `cargo` and `cooling` keys

- [ ] **Step 3: Update the upgrade keys, run-state defaults, and progression rules**

```ts
// src/game/core/types.ts
export type UpgradeKey = "scanner" | "thrusters" | "shield" | "damage" | "cadence" | "salvage" | "plating";
```

```ts
// src/game/core/GameController.ts
function createDefaultMeta(): MetaState {
  return {
    credits: 0,
    runNumber: 1,
    bestTake: 0,
    shipsRemaining: 3,
    systemIndex: 0,
    runsInSystem: 0,
    deliveredOrbs: 0,
    upgrades: {
      scanner: 0,
      thrusters: 0,
      shield: 0,
      damage: 0,
      cadence: 0,
      salvage: 0,
      plating: 0
    }
  };
}
```

```ts
// src/game/core/createRunState.ts
const RUN_DURATION = 120;

return {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  duration: RUN_DURATION,
  timeLeft: RUN_DURATION,
  collapseElapsed: 0,
  laneCollapsed: false,
  elapsed: 0,
  stormIntensity: 0,
  wave: 1,
  outcome: "running",
  message: "Step 1: move with WASD to the nearby orb cache. Step 2: press E to harvest orbs. Step 3: keep an eye on the debris timer. Step 4: dock with the courier ship and press E to deliver the haul.",
  messageTimer: 5,
  player: {
    x: playerStart.x,
    y: playerStart.y,
    vx: 0,
    vy: 0,
    facingX: 0,
    facingY: -1,
    hull: 100 + meta.upgrades.shield * 20,
    maxHull: 100 + meta.upgrades.shield * 20,
    cargo: 0,
    cargoValue: 0,
    invulnTimer: 0,
    scanCooldown: 0,
    fireCooldown: 0,
    harvestingNodeId: null,
    harvestTimer: 0,
    harvestDurationTotal: 0
  }
};
```

```ts
// src/game/core/GameController.ts
import { MIN_SYSTEM_RUNS, ORB_QUOTA_TARGET, getCarrySpeedMultiplier, isSystemJumpReady } from "./orbBalance";

function finalizeRun(meta: MetaState, run: RunState, outcome: Exclude<RunOutcome, "running">): RunSummary {
  const extractedOrbs = outcome === "extracted" ? run.player.cargo : 0;
  const extractedValue = outcome === "extracted" ? run.player.cargoValue : 0;
  const insurance = outcome === "extracted" ? 0 : Math.floor(run.player.cargoValue * getInsuranceFactor(meta));
  const payout = extractedValue + insurance;

  meta.runsInSystem += 1;
  meta.deliveredOrbs += extractedOrbs;
  meta.credits += payout;
  meta.bestTake = Math.max(meta.bestTake, payout);
  const jumpReady = isSystemJumpReady(meta);

  return {
    outcome,
    title: outcome === "extracted" ? (jumpReady ? "Jump Route Locked" : "Orb Transfer Complete") : outcome === "destroyed" ? "Skiff Lost" : "Storm Collapse",
    subtitle:
      outcome === "extracted"
        ? jumpReady
          ? "The courier ship now has enough delivered orbs to jump after the fourth run."
          : `Orbs transferred aboard. Deliver ${ORB_QUOTA_TARGET} total orbs across at least ${MIN_SYSTEM_RUNS} runs to jump.`
        : "The debris field swallowed the lane before docking, but your recorder still had some value.",
    extractedOrbs,
    cargoValue: run.player.cargoValue,
    payout,
    insurance,
    extractedValue,
    shipsRemaining: meta.shipsRemaining,
    fullReset: false,
    jumpReady
  };
}
```

- [ ] **Step 4: Remove heat generation, coolant usage, and cargo-cap checks from update flow**

```ts
// src/game/core/GameController.ts
const moveSpeedMultiplier = getCarrySpeedMultiplier(player.cargo);
const boostSpeed = (input.boostHeld ? getBoostSpeed(this.meta) : getBaseSpeed(this.meta)) * moveSpeedMultiplier;
const desiredVelocity = {
  x: moveVector.x * boostSpeed * harvestingSlow,
  y: moveVector.y * boostSpeed * harvestingSlow
};

if (input.interactPressed) {
  const atGate = distance(player, run.extraction) <= run.extraction.radius + 26;
  if (atGate && player.cargoValue > 0) {
    run.outcome = "extracted";
    this.summary = finalizeRun(this.meta, run, "extracted");
    this.emit();
    return;
  }

  const nearestNode = run.nodes
    .filter((node) => node.scanned && !node.harvested)
    .sort((left, right) => distance(player, left) - distance(player, right))[0];

  if (nearestNode && distance(player, nearestNode) <= 92) {
    player.harvestingNodeId = nearestNode.id;
    player.harvestTimer = getHarvestDuration(nearestNode.harvestDuration, this.meta);
    player.harvestDurationTotal = player.harvestTimer;
    setMessage(run, `Harvesting ${nearestNode.rarity} orb cache. Hold position until the link meter fills.`, 2.2);
  } else if (atGate && player.cargoValue <= 0) {
    setMessage(run, "That shuttle is ready to dock, but you need orbs aboard first.", 2.8);
  }
}
```

- [ ] **Step 5: Push value scaling outward and guarantee the first four runs reveal the local enemy pool**

```ts
// src/game/core/GameController.ts
function getLootTemplate(distanceFromShip: number): Omit<RunState["nodes"][number], "id" | "x" | "y" | "scanned" | "harvested"> {
  const band = Math.floor(distanceFromShip / 1200);
  const artifactChance = Math.min(0.5, Math.max(0, -0.08 + band * 0.045));
  const rareChance = Math.min(0.78, 0.08 + band * 0.085);

  if (rarity === "artifact") {
    return {
      rarity,
      cargo: Math.min(6, 1 + Math.floor(band / 2)),
      value: 14 + band * 12,
      harvestDuration: Math.min(4.8, 2 + band * 0.06)
    };
  }
```

```ts
// src/game/core/GameController.ts
function getSystemEnemyPool(meta: MetaState): EnemyKind[] {
  const system = getSystemDefinition(meta.systemIndex);
  if (meta.runsInSystem >= 3) {
    return [...system.enemies];
  }
  if (meta.runsInSystem === 2) {
    return [system.enemies[0], system.enemies[1], system.enemies[2]];
  }
  if (meta.runsInSystem === 1) {
    return [system.enemies[0], system.enemies[1]];
  }
  return [system.enemies[0]];
}
```

- [ ] **Step 6: Run the build and verify the game compiles with no heat references left in core logic**

Run: `npm run build`

Expected: PASS, or remaining failures isolated to HUD/render code still reading removed heat fields

- [ ] **Step 7: Commit**

```bash
git add src/game/core/types.ts src/game/core/orbBalance.ts src/game/core/orbBalance.spec.ts src/game/core/createRunState.ts src/game/core/GameController.ts
git commit -m "feat: rebalance orb progression rules"
```

### Task 3: Update HUD, Overlay, and Visual Copy

**Files:**
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\main.ts`
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\style.css`
- Modify: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\scenes\GameScene.ts`

- [ ] **Step 1: Rewrite the HUD markup to remove heat and simplify the system-runs display**

```ts
// src/main.ts
<section class="panel primary-panel">
  <div class="eyebrow" id="system-name">Cinder Wake</div>
  <div class="stat-row single-stat-row">
    <div>
      <span class="label">Hull</span>
      <strong id="hull-value">100</strong>
    </div>
  </div>
  <div class="meter"><div id="hull-bar" class="meter-fill hull-fill"></div></div>
</section>

<section class="panel status-panel">
  <div class="eyebrow">Run Feed</div>
  <div class="headline" id="cargo-value">0 orbs | 0 credits in hold</div>
  <p id="message-value" class="message">Harvest orb caches, bank them, and build enough quota to jump to the next system.</p>
  <div class="micro-grid">
    <div><span class="label">Orb Quota</span><strong id="quota-value">0 / 40</strong></div>
    <div><span class="label">System Runs</span><strong id="system-runs">0</strong></div>
```

- [ ] **Step 2: Update the render function to use orb-centric fields and remove heat math**

```ts
// src/main.ts
els.hullValue.textContent = `${Math.ceil(run.player.hull)} / ${run.player.maxHull}`;
els.timerValue.textContent = run.timeLeft > 0 ? `${Math.ceil(run.timeLeft)}s` : "0s";
els.hullBar.style.width = `${Math.max(0, hullRatio * 100)}%`;
els.cargoValue.textContent = `${run.player.cargo} orbs  |  ${run.player.cargoValue} credits in hold`;
els.quotaValue.textContent = `${snapshot.meta.deliveredOrbs} / 40`;
els.systemRuns.textContent = `${snapshot.meta.runsInSystem}`;
els.overlayCargo.textContent = `${summary.extractedOrbs}`;
```

- [ ] **Step 3: Tighten the panel layout after removing heat**

```css
/* src/style.css */
.stat-row.single-stat-row {
  grid-template-columns: 1fr;
}

.primary-panel {
  max-width: 320px;
}

.status-panel .micro-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] **Step 4: Run the build and verify the DOM bindings match the renamed IDs**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css src/game/scenes/GameScene.ts
git commit -m "feat: update hud for orb quota flow"
```

### Task 4: Smoke-Test the Rebalanced Loop

**Files:**
- Modify if needed: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\game\core\GameController.ts`
- Modify if needed: `C:\Users\sanay\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai\src\main.ts`

- [ ] **Step 1: Run a clean production build before manual QA**

Run: `npm run build`

Expected: PASS with only the existing large-chunk warning from Vite

- [ ] **Step 2: Start the dev server for gameplay smoke testing**

Run: `npm run dev`

Expected: Vite serves on `http://localhost:5173`

- [ ] **Step 3: Verify the required gameplay outcomes in the browser**

Checklist:

```md
- Heat bar and heat upgrade are gone.
- Expanded Hold / Heat Sink Grid no longer appear in upgrade offers.
- Delivering one common orb increments quota by exactly 1.
- Delivering one rare or artifact orb also increments quota by exactly 1.
- Rare and artifact orb colors still produce larger credit payouts.
- Carrying 10+ orbs noticeably slows the ship compared with 0 orbs.
- Jump readiness stays locked before run 4 even if the quota reaches 40.
- By the end of run 4, all three local enemy types for the solar system have appeared.
- The left HUD shows `System Runs` with a plain count, not `0 / 5`.
```

- [ ] **Step 4: Apply only the smallest balancing follow-up needed from the smoke test**

```ts
// src/game/core/GameController.ts
// Typical follow-up knobs to adjust after playtesting:
const weightedPool: EnemyKind[] = [...pool, ...pool.slice(0, 2)];
const maxEnemies = 7 + run.wave + Math.floor(distance(player, run.extraction) / 1500);
const band = Math.floor(distanceFromShip / 1300);
```

- [ ] **Step 5: Run the build again after any tuning**

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/core/GameController.ts src/main.ts
git commit -m "tune: polish orb economy pacing"
```

## Self-Review

- Spec coverage:
  - remove heat mechanic and upgrade: covered in Tasks 1-3
  - remove carry cap and capacity upgrade: covered in Task 2
  - make quota raw orb count with 40-orb target and 4-run minimum: covered in Tasks 1-2
  - keep credits tied to orb value/colors: covered in Task 2
  - push better loot farther out: covered in Task 2
  - guarantee enemy exposure before completion: covered in Task 2 and smoke-tested in Task 4
  - simplify HUD wording and system-runs label: covered in Task 3
- Placeholder scan: all steps include concrete file paths, commands, and example code or checklists.
- Type consistency:
  - `deliveredOrbs`, `extractedOrbs`, `ORB_QUOTA_TARGET`, and `MIN_SYSTEM_RUNS` are used consistently
  - removed upgrade keys are `cargo` and `cooling`, with the remaining keys matching the proposed type definition

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-20-orb-economy-balance.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
