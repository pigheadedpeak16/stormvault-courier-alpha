# Title Menu And Economy Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance progression so solar-system points and permanent upgrades advance much more slowly, move cruise speed into permanent upgrades, make late-run enemy pressure much harsher, and add a start/title menu with Codex and Solar Systems browsers.

**Architecture:** Extract the economy and spawn tuning into small pure helper functions so the harsh rebalance is testable without relying on the full Phaser runtime. Then wire the UI flow around a new title/menu state in `src/main.ts`, while keeping the live HUD and class overlays intact during runs.

**Tech Stack:** TypeScript, Phaser, Vite, DOM HUD overlays, Node `--experimental-strip-types` lightweight spec tests, `npm run build`

---

## File Map

### Existing files to modify

- `src/game/core/GameController.ts`
  Central simulation loop, progression state, snapshot shape, permanent upgrade list, enemy pressure scaling, Drone Bay behavior.
- `src/game/core/types.ts`
  Shared state types for HUD/menu snapshots and permanent upgrade keys.
- `src/game/core/createRunState.ts`
  Initial run defaults, including opening message and starting spawn cadence.
- `src/main.ts`
  DOM shell, title menu, codex screens, contract bay, HUD placement, and event wiring.
- `src/style.css`
  Title menu, codex screens, “coming soon” tier card, and updated HUD layout.
- `src/game/scenes/GameScene.ts`
  Runtime scene sync, any menu-safe rendering assumptions, and optional preview-driven display tweaks.
- `src/game/core/orbBalance.spec.ts`
  Keep existing balance check green if touched by import movement.

### New files to create

- `src/game/core/progressionBalance.ts`
  Pure helper functions for permanent costs, point-drop chances, and enemy surge scaling.
- `src/game/core/progressionBalance.spec.ts`
  Lightweight direct tests for the new harsh economy and late-run pressure rules.

---

### Task 1: Extract progression-balance helpers and lock the harsh targets in tests

**Files:**
- Create: `src/game/core/progressionBalance.ts`
- Create: `src/game/core/progressionBalance.spec.ts`
- Modify: `package.json` only if an extra check script is required; otherwise keep current scripts unchanged

- [ ] **Step 1: Write the failing balance tests**

Create `src/game/core/progressionBalance.spec.ts` with explicit targets for the new economy and pressure rules.

```ts
import assert from "node:assert/strict";
import {
  getPermanentUpgradeCost,
  getEnemyPointDropAmount,
  getEnemyPressureProfile
} from "./progressionBalance";

function withMockedRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

assert.equal(getPermanentUpgradeCost("scanSuite", 0), 180);
assert.equal(getPermanentUpgradeCost("cruiseThrusters", 0), 260);
assert.equal(getPermanentUpgradeCost("classMatrix", 0), 900);
assert.equal(getPermanentUpgradeCost("classMatrix", 1), 1800);

assert.equal(withMockedRandom(0.99, () => getEnemyPointDropAmount("drone")), 0);
assert.equal(withMockedRandom(0.10, () => getEnemyPointDropAmount("drone")), 1);
assert.equal(withMockedRandom(0.70, () => getEnemyPointDropAmount("carrier")), 2);

const early = getEnemyPressureProfile({ timeLeft: 240, duration: 300, distancePressure: 0, wave: 2 });
const finalMinute = getEnemyPressureProfile({ timeLeft: 45, duration: 300, distancePressure: 1, wave: 5 });

assert.ok(finalMinute.maxEnemies >= early.maxEnemies + 18);
assert.ok(finalMinute.spawnBurst >= 4);
assert.ok(finalMinute.spawnIntervalMax < early.spawnIntervalMax);
```

- [ ] **Step 2: Run the spec test to verify it fails**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: FAIL with module not found or missing export errors for `progressionBalance`.

- [ ] **Step 3: Implement the pure balance helpers**

Create `src/game/core/progressionBalance.ts`.

```ts
import type { EnemyKind, PermanentUpgradeKey } from "./types";

export function getPermanentUpgradeCost(key: PermanentUpgradeKey, level: number): number {
  const baseCosts: Record<PermanentUpgradeKey, number> = {
    scanSuite: 180,
    harvesterRig: 180,
    orbAppraisal: 220,
    insuranceCore: 240,
    massStabilizers: 260,
    cruiseThrusters: 260,
    prospectingArray: 320,
    classMatrix: 900
  };

  const growth = key === "classMatrix" ? 900 : Math.round(baseCosts[key] * 0.7);
  return baseCosts[key] + level * growth;
}

export function getEnemyPointDropAmount(kind: EnemyKind): number {
  if (kind === "carrier") {
    return Math.random() < 0.75 ? 2 : 1;
  }

  const strongerKinds = new Set<EnemyKind>([
    "siege",
    "shieldfrigate",
    "missileer",
    "minelayer",
    "jammer",
    "harpoon",
    "cloak"
  ]);

  if (strongerKinds.has(kind)) {
    return Math.random() < 0.18 ? 1 : 0;
  }

  return Math.random() < 0.08 ? 1 : 0;
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
  const finalMinutePressure = args.timeLeft <= 60 ? 1 - args.timeLeft / 60 : 0;

  const maxEnemies =
    7 +
    args.wave +
    args.distancePressure * 2 +
    Math.floor(timerPressure * 12) +
    (args.timeLeft <= 60 ? 16 + Math.floor(finalMinutePressure * 26) : 0);

  const spawnBurst = args.timeLeft <= 60 ? 4 + Math.floor(finalMinutePressure * 3) : 1 + Math.floor(timerPressure * 2);

  return {
    maxEnemies,
    spawnBurst,
    spawnIntervalMin: args.timeLeft <= 60 ? 0.04 : 0.4,
    spawnIntervalMax: Math.max(0.12, 2.2 - timerPressure * 1.2 - finalMinutePressure * 1.3)
  };
}
```

- [ ] **Step 4: Run the spec test to verify it passes**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add src/game/core/progressionBalance.ts src/game/core/progressionBalance.spec.ts
git commit -m "test: lock harsher progression balance targets"
```

### Task 2: Move cruise speed into permanent upgrades and steepen contract-bay pricing

**Files:**
- Modify: `src/game/core/types.ts`
- Modify: `src/game/core/GameController.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing contract-bay and snapshot assertions**

Extend `src/game/core/progressionBalance.spec.ts` with checks that the permanent-upgrade key list includes `cruiseThrusters` and the solar-system stat list no longer includes `cruiseSpeed`.

```ts
import { SYSTEM_STAT_KEYS, PERMANENT_UPGRADE_KEYS } from "./types";

assert.ok(PERMANENT_UPGRADE_KEYS.includes("cruiseThrusters"));
assert.ok(!SYSTEM_STAT_KEYS.includes("cruiseSpeed"));
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: FAIL because the exported key arrays do not exist yet or still include `cruiseSpeed`.

- [ ] **Step 3: Implement the type and snapshot migration**

Update `src/game/core/types.ts` to export explicit key arrays and add the new permanent key.

```ts
export const SYSTEM_STAT_KEYS = [
  "healthRegen",
  "maxHealth",
  "bodyDamage",
  "bulletSpeed",
  "bulletPenetration",
  "bulletDamage",
  "reload"
] as const;

export const PERMANENT_UPGRADE_KEYS = [
  "scanSuite",
  "harvesterRig",
  "orbAppraisal",
  "insuranceCore",
  "massStabilizers",
  "cruiseThrusters",
  "prospectingArray",
  "classMatrix"
] as const;
```

Update `src/game/core/GameController.ts`:

```ts
import { getEnemyPointDropAmount, getEnemyPressureProfile, getPermanentUpgradeCost } from "./progressionBalance";

const SYSTEM_STAT_OFFERS = [
  { key: "healthRegen", label: "Health Regen", hotkey: "1" },
  { key: "maxHealth", label: "Max Health", hotkey: "2" },
  { key: "bodyDamage", label: "Body Damage", hotkey: "3" },
  { key: "bulletSpeed", label: "Bullet Speed", hotkey: "4" },
  { key: "bulletPenetration", label: "Bullet Penetration", hotkey: "5" },
  { key: "bulletDamage", label: "Bullet Damage", hotkey: "6" },
  { key: "reload", label: "Reload", hotkey: "7" }
] as const;

function getBaseSpeed(meta: MetaState): number {
  return 168 + meta.permanentUpgrades.cruiseThrusters * 10;
}
```

Update `src/main.ts` so the run HUD still shows `Cruise Speed`, but it no longer renders a spendable bottom-left button for it.

- [ ] **Step 4: Run the balance spec and TypeScript build checks**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
npm run build
```

Expected: PASS for the spec and a successful production build.

- [ ] **Step 5: Commit**

```bash
git add src/game/core/types.ts src/game/core/GameController.ts src/main.ts src/game/core/progressionBalance.spec.ts
git commit -m "feat: move cruise speed into permanent upgrades"
```

### Task 3: Make solar-system point gain stingy and final-minute enemy pressure overwhelming

**Files:**
- Modify: `src/game/core/GameController.ts`
- Test: `src/game/core/progressionBalance.spec.ts`

- [ ] **Step 1: Write the failing pressure-integration assertions**

Extend `src/game/core/progressionBalance.spec.ts` to assert the real controller-facing helpers are used for point drops and spawn bursts.

```ts
const panic = getEnemyPressureProfile({ timeLeft: 15, duration: 300, distancePressure: 2, wave: 7 });
assert.ok(panic.maxEnemies >= 40);
assert.ok(panic.spawnBurst >= 5);
assert.ok(panic.spawnIntervalMin <= 0.04);
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: FAIL on the stricter panic-phase numbers.

- [ ] **Step 3: Wire the controller to the new harsh helpers**

Update `src/game/core/GameController.ts`.

```ts
const pressure = getEnemyPressureProfile({
  timeLeft: run.timeLeft,
  duration: run.duration,
  distancePressure,
  wave: run.wave
});

const maxEnemies = pressure.maxEnemies;

while (run.spawnTimer <= 0 && run.enemies.filter((enemy) => enemy.kind !== "carrier").length < maxEnemies) {
  const room = maxEnemies - run.enemies.filter((enemy) => enemy.kind !== "carrier").length;
  const spawnCount = Math.max(1, Math.min(pressure.spawnBurst, room));
  for (let index = 0; index < spawnCount; index += 1) {
    run.enemies.push(spawnEnemy(run, this.meta));
  }
  run.spawnTimer += clamp(
    randomRange(pressure.spawnIntervalMin, pressure.spawnIntervalMax),
    pressure.spawnIntervalMin,
    pressure.spawnIntervalMax
  );
}

const reward = getEnemyPointDropAmount(enemy.kind);
if (reward > 0) {
  this.spawnSystemPointPickup(run, enemy, reward);
}
```

- [ ] **Step 4: Run the spec and full build**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
npm run build
```

Expected: PASS. The build may still show the existing Vite chunk-size warning; that warning is acceptable.

- [ ] **Step 5: Commit**

```bash
git add src/game/core/GameController.ts src/game/core/progressionBalance.spec.ts
git commit -m "feat: harden late-run pressure and slow system point gain"
```

### Task 4: Add a proper title menu shell with Play, Codex, Solar Systems, and Tier 3 Coming Soon

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `src/game/core/GameController.ts`

- [ ] **Step 1: Write the failing UI-state smoke checks**

Because there is no DOM test harness yet, add a pure state helper in `src/main.ts`-adjacent code first by creating a menu mode enum in `GameController` snapshot output, then verify it from a lightweight spec.

Append to `src/game/core/progressionBalance.spec.ts`:

```ts
import { GameController } from "./GameController";

const controller = new GameController();
const snapshot = controller.getSnapshot();
assert.equal(snapshot.menu.screen, "title");
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: FAIL because `snapshot.menu` is missing.

- [ ] **Step 3: Implement menu state and UI**

Add a lightweight menu state to `GameController`:

```ts
private menuScreen: "title" | "codex-enemies" | "codex-systems" | "tier3" | "hidden" = "title";

openMenu(screen: "title" | "codex-enemies" | "codex-systems" | "tier3"): void {
  this.menuScreen = screen;
  this.emit();
}

startGameFromMenu(): void {
  this.menuScreen = "hidden";
  this.emit();
}
```

Expose it in `getSnapshot()`:

```ts
menu: {
  screen: this.menuScreen,
  enemyCodex: ENEMY_CODEX_ENTRIES,
  solarSystems: SOLAR_SYSTEMS.map((system) => ({
    name: system.name,
    enemies: system.enemies,
    accent: system.theme.accent
  }))
}
```

Update `src/main.ts` to render:

- title card with `Play`, `Codex`, `Solar Systems`, `Tier 3`
- codex enemy browser with previews and descriptions
- solar-systems browser with themed cards
- tier-3 card saying `Coming Soon`

Update `src/style.css` with large centered title-menu styles and card-grid layouts for codex browsing.

- [ ] **Step 4: Run the build**

Run:

```bash
npm run build
```

Expected: PASS with the title menu shown on first load and the existing chunk-size warning only.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css src/game/core/GameController.ts src/game/core/progressionBalance.spec.ts
git commit -m "feat: add title menu and codex browsers"
```

### Task 5: Polish HUD placement and “Coming Soon” Tier 3 messaging

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing markup expectation**

Add a simple assertion in `src/game/core/progressionBalance.spec.ts` against the menu-state data for the tier-3 screen.

```ts
const controllerAfterMenu = new GameController();
controllerAfterMenu.openMenu("tier3");
assert.equal(controllerAfterMenu.getSnapshot().menu.screen, "tier3");
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
```

Expected: FAIL because `openMenu` or the `tier3` screen is not implemented yet.

- [ ] **Step 3: Implement the final HUD/menu polish**

Update `src/main.ts` and `src/style.css` so:

- the extraction vector remains centered near the top during gameplay
- the title screen has a visible `Tier 3` menu tile that opens a `Coming Soon` panel
- the codex enemy cards include preview boxes and concise descriptions
- the solar-system cards list the three enemy names in order

Markup sketch:

```html
<section id="title-menu" class="title-menu">
  <div class="title-card">
    <div class="eyebrow">Stormvault Courier Alpha</div>
    <h1>Stormvault Courier</h1>
    <div class="menu-grid">
      <button id="menu-play">Play</button>
      <button id="menu-codex">Codex</button>
      <button id="menu-systems">Solar Systems</button>
      <button id="menu-tier3">Tier 3 <span>Coming Soon</span></button>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run the full verification**

Run:

```bash
node --experimental-strip-types src/game/core/progressionBalance.spec.ts
npm run build
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css src/game/core/progressionBalance.spec.ts
git commit -m "feat: polish title menu and codex navigation"
```

## Self-Review

### Spec coverage check

- harsher permanent economy: covered in Tasks 1 and 2
- `Class Matrix Lv 1` pushed toward system 2/3: covered in Task 1 helper costs and Task 2 controller wiring
- cruise speed moved to permanent upgrades: covered in Task 2
- drastically lower point gain: covered in Task 3
- much harsher enemy scaling/final minute: covered in Task 3
- title menu with Play/Codex/Solar Systems/Tier 3: covered in Tasks 4 and 5
- codex enemy previews and solar system browser: covered in Tasks 4 and 5
- Tier 3 marked coming soon: covered in Task 5

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Each task contains explicit files, commands, and code sketches.

### Type consistency check

- `cruiseThrusters` is the permanent key used consistently across Tasks 1 and 2.
- `menu.screen` uses one consistent union: `"title" | "codex-enemies" | "codex-systems" | "tier3" | "hidden"`.
- The new helper module name is used consistently as `progressionBalance.ts`.

