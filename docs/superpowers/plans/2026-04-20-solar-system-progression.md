# Solar-System Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current upgrade loop with solar-system-scoped combat progression plus permanent contract-bay upgrades, add live in-run stat spending and paused class branching, and rebalance run pressure around a 5-minute debris clock.

**Architecture:** Keep the Phaser runtime centered on `GameController`, but split progression data into two domains: permanent contract-bay upgrades on `MetaState` and solar-system combat progression/class state on a new system-build state that persists across runs until jump. Surface the system-build through a bottom-left HUD panel in `main.ts`, route point spending and class branching through the controller, and keep scene rendering dumb by reading the richer snapshot.

**Tech Stack:** TypeScript, Phaser, Vite, DOM HUD overlay, Node assert spec checks.

---

## File Map

- Modify: `src/game/core/types.ts`
  - Define permanent upgrade keys, solar-system stat keys, class tier data, and snapshot payloads for live point spending and class branch prompts.
- Modify: `src/game/core/GameController.ts`
  - Own the new progression state, enemy point rewards, class thresholds, permanent upgrade effects, timer rebalance, and late-run enemy scaling.
- Modify: `src/game/core/createRunState.ts`
  - Start runs from the current solar-system build, apply the 5-minute duration, and seed player stats from the active system build plus permanent upgrades.
- Modify: `src/game/core/orbBalance.ts`
  - Keep orb quota and carry drag helpers aligned with the new permanent `Mass Stabilizers` behavior.
- Modify: `src/game/core/orbBalance.spec.ts`
  - Update balance assertions for the permanent upgrade helpers that affect carry drag and quota logic.
- Modify: `src/main.ts`
  - Replace the old contract-bay-only UI with a live bottom-left combat stat panel, in-run point counter, and paused tier-branch modal.
- Modify: `src/style.css`
  - Style the bottom-left stat bars and class branch prompt without crowding the playfield.
- Modify: `src/game/scenes/GameScene.ts`
  - Wire hotkeys/click actions for live stat spending and freeze simulation when class branching is active.
- Modify: `src/game/scenes/BootScene.ts`
  - Add any small textures/icons needed for stat bars or class prompt affordances.

### Task 1: Model the new progression state

**Files:**
- Modify: `src/game/core/types.ts`
- Modify: `src/game/core/GameController.ts`
- Test: `src/game/core/orbBalance.spec.ts`

- [ ] **Step 1: Add permanent and solar-system upgrade types**

Add dedicated types so permanent upgrades and solar-system stats cannot be mixed:

```ts
export type PermanentUpgradeKey =
  | "scanSuite"
  | "harvesterRig"
  | "orbAppraisal"
  | "insuranceCore"
  | "massStabilizers"
  | "prospectingArray"
  | "classMatrix";

export type SystemStatKey =
  | "maxHealth"
  | "healthRegen"
  | "bodyDamage"
  | "bulletSpeed"
  | "bulletPenetration"
  | "bulletDamage"
  | "reload"
  | "cruiseSpeed";
```

- [ ] **Step 2: Add solar-system build state**

Extend `MetaState` or adjacent controller-owned state with a persistent system-build object:

```ts
export interface SystemBuildState {
  points: number;
  spentPoints: number;
  stats: Record<SystemStatKey, number>;
  classPath: string[];
  classTier: 1 | 2 | 3 | 4;
  currentClass: string;
  pendingBranchTier: 2 | 3 | 4 | null;
}
```

- [ ] **Step 3: Add snapshot fields for the HUD**

Expose the live bottom-left panel and branch prompt through `HudSnapshot`:

```ts
export interface HudSnapshot {
  // existing fields...
  availableSystemPoints: number;
  systemBuild: SystemBuildState;
  systemStatOffers: Array<{
    key: SystemStatKey;
    label: string;
    level: number;
    hotkey: string;
  }>;
  classBranchPrompt: {
    tier: 2 | 3 | 4;
    options: Array<{ id: string; label: string; description: string; locked: boolean; lockedReason?: string }>;
  } | null;
}
```

- [ ] **Step 4: Run the balance spec**

Run: `npm run check:orb-balance`

Expected: PASS

### Task 2: Rebuild permanent upgrades

**Files:**
- Modify: `src/game/core/types.ts`
- Modify: `src/game/core/GameController.ts`
- Modify: `src/game/core/createRunState.ts`

- [ ] **Step 1: Replace the old upgrade list**

Swap the current contract-bay upgrade definitions for:

```ts
const PERMANENT_UPGRADE_DEFS: UpgradeDefinition[] = [
  { key: "scanSuite", label: "Scan Suite", description: "Bigger scan radius and faster scan cooldown." },
  { key: "harvesterRig", label: "Harvester Rig", description: "Faster orb extraction from nodes." },
  { key: "orbAppraisal", label: "Orb Appraisal", description: "Higher-value orb colors pay more credits." },
  { key: "insuranceCore", label: "Insurance Core", description: "Better credit payout when a run fails." },
  { key: "massStabilizers", label: "Mass Stabilizers", description: "Carrying orbs slows the ship less." },
  { key: "prospectingArray", label: "Prospecting Array", description: "Deep space spawns richer orb colors more often." },
  { key: "classMatrix", label: "Class Matrix", description: "Unlocks deeper class tiers permanently." }
];
```

- [ ] **Step 2: Route helper functions to the new permanent upgrades**

Update controller helpers so they read the permanent upgrade keys instead of the removed combat upgrades:

```ts
function getScanRange(meta: MetaState): number {
  return 280 + meta.permanentUpgrades.scanSuite * 55;
}

function getHarvestDuration(duration: number, meta: MetaState): number {
  return Math.max(0.55, duration * (1 - meta.permanentUpgrades.harvesterRig * 0.08));
}
```

- [ ] **Step 3: Move carry-drag relief into `Mass Stabilizers`**

Adjust the carry helper to accept a stabilizer rank:

```ts
export function getCarrySpeedMultiplier(orbs: number, stabilizerRank = 0): number {
  const drag = Math.max(0.007, LINEAR_ORB_DRAG - stabilizerRank * 0.0015);
  return Math.max(CARRY_MULTIPLIER_FLOOR, 1 - drag * orbs);
}
```

- [ ] **Step 4: Seed run state from permanent upgrades only where intended**

Apply only the allowed permanent effects when creating a run:

```ts
duration: 300,
player: {
  hull: getSystemMaxHull(meta),
  maxHull: getSystemMaxHull(meta),
  // no permanent bullet-damage style bonuses here
}
```

### Task 3: Add solar-system combat points and live stat spending

**Files:**
- Modify: `src/game/core/GameController.ts`
- Modify: `src/game/core/createRunState.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Reward enemy kills with system points**

Add a helper like:

```ts
function getEnemyPointReward(kind: EnemyKind): number {
  switch (kind) {
    case "carrier":
      return 8;
    case "siege":
    case "shieldfrigate":
      return 4;
    case "missileer":
    case "minelayer":
    case "harpoon":
      return 3;
    default:
      return 2;
  }
}
```

- [ ] **Step 2: Preserve unspent and spent points across runs in the same solar system**

On enemy death:

```ts
this.meta.systemBuild.points += getEnemyPointReward(enemy.kind);
```

On jump to the next system:

```ts
this.meta.systemBuild = createDefaultSystemBuild();
```

- [ ] **Step 3: Add a spend-system-point controller action**

Implement:

```ts
spendSystemPoint(key: SystemStatKey): boolean {
  if (this.meta.systemBuild.points <= 0) return false;
  this.meta.systemBuild.points -= 1;
  this.meta.systemBuild.spentPoints += 1;
  this.meta.systemBuild.stats[key] += 1;
  return true;
}
```

- [ ] **Step 4: Surface a bottom-left panel with visible `xN` point count**

Add a DOM section in `main.ts` similar to:

```html
<section class="panel system-stats-panel">
  <div class="points-badge" id="system-points">x0</div>
  <button data-stat="healthRegen">Health Regen [1] <span>+</span></button>
  <button data-stat="maxHealth">Max Health [2] <span>+</span></button>
  <button data-stat="bodyDamage">Body Damage [3] <span>+</span></button>
  <button data-stat="bulletSpeed">Bullet Speed [4] <span>+</span></button>
  <button data-stat="bulletPenetration">Bullet Penetration [5] <span>+</span></button>
  <button data-stat="bulletDamage">Bullet Damage [6] <span>+</span></button>
  <button data-stat="reload">Reload [7] <span>+</span></button>
  <button data-stat="cruiseSpeed">Cruise Speed [8] <span>+</span></button>
</section>
```

- [ ] **Step 5: Wire hotkeys and button clicks**

In `GameScene.ts`, map number keys `ONE` through `EIGHT` or direct keyboard codes to calls back into the controller without pausing the run.

### Task 4: Make solar-system stats actually affect combat

**Files:**
- Modify: `src/game/core/GameController.ts`
- Modify: `src/game/core/createRunState.ts`

- [ ] **Step 1: Add helpers for the new stat effects**

Implement focused helpers:

```ts
function getSystemMaxHull(meta: MetaState): number {
  return 100 + meta.systemBuild.stats.maxHealth * 14;
}

function getSystemRegenPerSecond(meta: MetaState): number {
  return meta.systemBuild.stats.healthRegen * 0.45;
}

function getBulletDamage(meta: MetaState): number {
  return 1 + meta.systemBuild.stats.bulletDamage * 0.6;
}
```

- [ ] **Step 2: Apply regen and combat stats in the update loop**

Use the new helpers:

```ts
player.hull = clamp(player.hull + getSystemRegenPerSecond(this.meta) * dt, 0, player.maxHull);
player.fireCooldown = getFireCooldown(this.meta);
const projectileSpeed = getProjectileSpeed(this.meta);
```

- [ ] **Step 3: Apply body damage and penetration**

When body collisions happen, scale damage by `bodyDamage`. When projectiles hit enemies or missiles, allow `bulletPenetration` to preserve some projectile life or damage-through behavior instead of disappearing immediately.

### Task 5: Add class thresholds and paused branching

**Files:**
- Modify: `src/game/core/types.ts`
- Modify: `src/game/core/GameController.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Define class trees and threshold table**

Add a small starting tree:

```ts
const CLASS_THRESHOLDS = {
  tier2: 10,
  tier3: 24,
  tier4: 42
} as const;
```

and class options:

```ts
const CLASS_OPTIONS = {
  Courier: { tier2: ["Twinframe", "Longshot", "Drone Bay", "Bulwark"] },
  Twinframe: { tier3: ["Splitfire", "Gatling"] },
  Longshot: { tier3: ["Railcaster", "Missile Rack"] },
  Drone Bay: { tier3: ["Overseer", "Swarm Carrier"] },
  Bulwark: { tier3: ["Trapper", "Ramship"] }
} as const;
```

- [ ] **Step 2: Gate branching by `Class Matrix`**

Add:

```ts
function getUnlockedClassTier(meta: MetaState): 2 | 3 | 4 {
  return meta.permanentUpgrades.classMatrix >= 2
    ? 4
    : meta.permanentUpgrades.classMatrix >= 1
      ? 3
      : 2;
}
```

- [ ] **Step 3: Pause only when a branch is ready**

When spent combat points cross a threshold:

```ts
if (!this.runPausedForBranch && this.shouldOfferTierBranch()) {
  this.meta.systemBuild.pendingBranchTier = 2;
}
```

In `update()`:

```ts
if (this.meta.systemBuild.pendingBranchTier) {
  this.emit();
  return;
}
```

- [ ] **Step 4: Add a class branch modal**

Create a centered DOM modal that appears only for pending branches, lists available classes, and shows lock text like:

```html
<p>Tier 4 requires Class Matrix Lv 2.</p>
```

- [ ] **Step 5: Resume play after choice**

Implement:

```ts
chooseClassBranch(nextClassId: string): boolean
```

and clear `pendingBranchTier` once the player chooses.

### Task 6: Rebalance run pressure for 5-minute runs

**Files:**
- Modify: `src/game/core/createRunState.ts`
- Modify: `src/game/core/GameController.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Increase run duration to 300 seconds**

Set:

```ts
duration: 300,
timeLeft: 300,
```

- [ ] **Step 2: Keep the debris field as anti-greed pressure**

Do not soften the late run into safety. Preserve the idea that long distance + high orb weight + low timer should produce dangerous returns.

- [ ] **Step 3: Make enemy pressure ramp linearly as time approaches zero**

Replace abrupt spawn pressure with a linear scalar:

```ts
const timerPressure = 1 - run.timeLeft / run.duration;
const linearEnemyPressure = Phaser.Math.Linear(0, 1, timerPressure);
run.spawnTimer = clamp(2.8 - linearEnemyPressure * 1.7 + Math.random() * 0.5, 0.3, 2.8);
```

- [ ] **Step 4: Update debris HUD copy**

Make the HUD messaging acknowledge the anti-greed pressure model rather than generic storm flavor.

### Task 7: Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-20-solar-system-progression.md`

- [ ] **Step 1: Run balance checks**

Run: `npm run check:orb-balance`

Expected: PASS

- [ ] **Step 2: Run full build**

Run: `npm run build`

Expected: PASS with only the existing Vite chunk-size warning acceptable

- [ ] **Step 3: Manual smoke checklist**

Verify:

- kill enemies and see combat points increase
- spend points during active gameplay from the bottom-left panel
- reach a class threshold and see the game pause for branch selection
- confirm locked deeper tiers show the `Class Matrix` requirement
- confirm the run lasts 5 minutes
- confirm enemy pressure ramps steadily as the timer falls
- confirm solar-system stats persist across runs in the same system and reset on jump
- confirm permanent upgrades still persist across systems
