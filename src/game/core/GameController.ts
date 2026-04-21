import { createRunState } from "./createRunState.ts";
import { MIN_SYSTEM_RUNS, ORB_QUOTA_TARGET, getCarrySpeedMultiplier, isSystemJumpReady } from "./orbBalance.ts";
import {
  getEnemyPointDropAmount,
  getEnemyPressureProfile,
  getPermanentUpgradeCost
} from "./progressionBalance.ts";
import type {
  ClassBranchPrompt,
  DebrisState,
  EnemyCodexEntry,
  EnemyKind,
  EffectEvent,
  EnemyState,
  FrameInput,
  HudSnapshot,
  MenuScreen,
  MetaState,
  PermanentUpgradeKey,
  ProjectileState,
  RunOutcome,
  RunState,
  RunSummary,
  SolarSystemCodexEntry,
  SystemBuildState,
  SystemStatKey,
  SystemTheme,
  UpgradeDefinition,
  UpgradeOffer,
  Vector2
} from "./types.ts";

function createDefaultSystemBuild(): SystemBuildState {
  return {
    points: 0,
    spentPoints: 0,
    stats: {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0
    },
    currentClass: "Courier",
    classTier: 1,
    classPath: ["Courier"],
    pendingBranchTier: null
  };
}

function createDefaultMeta(): MetaState {
  return {
    credits: 0,
    runNumber: 1,
    bestTake: 0,
    shipsRemaining: 3,
    systemIndex: 0,
    runsInSystem: 0,
    deliveredOrbs: 0,
    permanentUpgrades: {
      scanSuite: 0,
      harvesterRig: 0,
      orbAppraisal: 0,
      insuranceCore: 0,
      massStabilizers: 0,
      cruiseThrusters: 0,
      prospectingArray: 0,
      classMatrix: 0
    },
    systemBuild: createDefaultSystemBuild()
  };
}

const PERMANENT_UPGRADE_DEFS: UpgradeDefinition[] = [
  {
    key: "scanSuite",
    label: "Scan Suite",
    description: "Bigger scan radius and faster scan cooldown."
  },
  {
    key: "harvesterRig",
    label: "Harvester Rig",
    description: "Faster orb extraction from nodes."
  },
  {
    key: "orbAppraisal",
    label: "Orb Appraisal",
    description: "Higher-value orb colors pay more credits."
  },
  {
    key: "insuranceCore",
    label: "Insurance Core",
    description: "Better credit payout when a run fails."
  },
  {
    key: "massStabilizers",
    label: "Mass Stabilizers",
    description: "Carrying orbs slows the ship less."
  },
  {
    key: "cruiseThrusters",
    label: "Cruise Thrusters",
    description: "Raises your baseline cruise speed across every run."
  },
  {
    key: "prospectingArray",
    label: "Prospecting Array",
    description: "Deep space spawns richer orb colors more often."
  },
  {
    key: "classMatrix",
    label: "Class Matrix",
    description: "Unlocks deeper class tiers permanently."
  }
];

const SYSTEM_STAT_OFFERS: Array<{ key: SystemStatKey; label: string; hotkey: string }> = [
  { key: "healthRegen", label: "Health Regen", hotkey: "1" },
  { key: "maxHealth", label: "Max Health", hotkey: "2" },
  { key: "bodyDamage", label: "Body Damage", hotkey: "3" },
  { key: "bulletSpeed", label: "Bullet Speed", hotkey: "4" },
  { key: "bulletPenetration", label: "Bullet Penetration", hotkey: "5" },
  { key: "bulletDamage", label: "Bullet Damage", hotkey: "6" },
  { key: "reload", label: "Reload", hotkey: "7" }
];

const CLASS_THRESHOLDS = {
  2: 10,
  3: 24,
  4: 42
} as const;

const CLASS_TREE: Record<string, Partial<Record<2 | 3 | 4, string[]>>> = {
  Courier: { 2: ["Twinframe", "Longshot", "Drone Bay", "Bulwark"] },
  Twinframe: { 3: ["Splitfire", "Gatling"] },
  Longshot: { 3: ["Railcaster", "Missile Rack"] },
  "Drone Bay": { 3: ["Overseer", "Swarm Carrier"] },
  Bulwark: { 3: ["Trapper", "Ramship"] },
  Splitfire: { 4: ["Broadside"] },
  Gatling: { 4: ["Vulcan"] },
  Railcaster: { 4: ["Beam Lancer"] },
  "Missile Rack": { 4: ["Siege Boat"] },
  Overseer: { 4: ["Command Core"] },
  "Swarm Carrier": { 4: ["Hive Carrier"] },
  Trapper: { 4: ["Fortress"] },
  Ramship: { 4: ["Juggernaut"] }
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  Twinframe: "Two forward cannons firing parallel pressure lanes.",
  Longshot: "Long-barrel frame firing slower, heavier siege shells.",
  "Drone Bay": "Drops the main gun and pilots crash drones by mouse.",
  Bulwark: "Heavy bruiser built to ram hard with only a weak sidearm.",
  Splitfire: "Twinframe branch with wider spread lanes.",
  Gatling: "Twinframe branch with high-volume fire.",
  Railcaster: "Longshot branch with fast piercing rounds.",
  "Missile Rack": "Longshot branch with heavier salvo pressure.",
  Overseer: "Drone Bay branch with smarter controlled fire.",
  "Swarm Carrier": "Drone Bay branch with broader projectile swarms.",
  Trapper: "Bulwark branch with control-oriented area denial.",
  Ramship: "Bulwark branch built for direct impact damage.",
  Broadside: "Floods the lane with multi-angle fire.",
  Vulcan: "Extreme sustained fire rate.",
  "Beam Lancer": "Punchy precision class with piercing lanes.",
  "Siege Boat": "Heavy long-range bombardment.",
  "Command Core": "Elite controlled assault platform.",
  "Hive Carrier": "Projectile cloud specialist.",
  Fortress: "Maximum space control and survivability.",
  Juggernaut: "Massive impact ship with brutal close-range pressure."
};

const ENEMY_CODEX: Record<EnemyKind, EnemyCodexEntry> = {
  drone: {
    kind: "drone",
    name: "Drone",
    description: "Baseline skirmisher that closes straight into your firing lane.",
    accent: "#ff72ba"
  },
  hunter: {
    kind: "hunter",
    name: "Hunter",
    description: "Fast pursuit hull that keeps direct pressure on your position.",
    accent: "#ffb86c"
  },
  shooter: {
    kind: "shooter",
    name: "Shooter",
    description: "Mid-range gunship that strafes and peppers you with bolt fire.",
    accent: "#b57cff"
  },
  missileer: {
    kind: "missileer",
    name: "Missile Frigate",
    description: "Standoff frigate that launches tracking missiles from long range.",
    accent: "#ffcf74"
  },
  carrier: {
    kind: "carrier",
    name: "Carrier",
    description: "Heavy capital hull that spawns attack waves and charges a beam lane.",
    accent: "#ff8f96"
  },
  minelayer: {
    kind: "minelayer",
    name: "Mine Layer",
    description: "Area-denial ship that seeds drifting explosives around the lane.",
    accent: "#74f5c0"
  },
  interceptor: {
    kind: "interceptor",
    name: "Interceptor",
    description: "High-speed diver that bursts in with sudden acceleration windows.",
    accent: "#8aefff"
  },
  leech: {
    kind: "leech",
    name: "Leech Drone",
    description: "Close-range parasite that sticks near the hull and chips you down.",
    accent: "#b8ff6a"
  },
  jammer: {
    kind: "jammer",
    name: "Jammer",
    description: "Electronic-warfare support ship that shrinks your scan coverage nearby.",
    accent: "#ffec7e"
  },
  shieldfrigate: {
    kind: "shieldfrigate",
    name: "Shield Frigate",
    description: "Escort frigate that projects cover for nearby hostiles while firing back.",
    accent: "#8fc3ff"
  },
  splitter: {
    kind: "splitter",
    name: "Splitter",
    description: "Aggressive hull that breaks apart into fresh threats when destroyed.",
    accent: "#ffbb72"
  },
  harpoon: {
    kind: "harpoon",
    name: "Harpoon Ship",
    description: "Control ship that snaps tether shots across your route to pin you down.",
    accent: "#ff8b9a"
  },
  cloak: {
    kind: "cloak",
    name: "Cloak Skimmer",
    description: "Ambush skimmer that fades at range and reappears when it commits.",
    accent: "#e2a8ff"
  },
  swarm: {
    kind: "swarm",
    name: "Scrap Swarm",
    description: "Erratic micro-hostile cloud that overwhelms space with movement.",
    accent: "#ff6d93"
  },
  siege: {
    kind: "siege",
    name: "Siege Cruiser",
    description: "Slow artillery platform that locks bombardment onto your predicted path.",
    accent: "#d08fff"
  }
};

interface SolarSystemDefinition {
  name: string;
  orbTarget: number;
  enemies: [EnemyKind, EnemyKind, EnemyKind];
  theme: SystemTheme;
}

const SOLAR_SYSTEMS: SolarSystemDefinition[] = [
  {
    name: "Cinder Wake",
    orbTarget: ORB_QUOTA_TARGET,
    enemies: ["drone", "hunter", "shooter"],
    theme: {
      name: "Cinder Wake",
      accent: "#5be8ff",
      bgTop: "#123650",
      bgBottom: "#041019",
      panel: "rgba(7, 18, 28, 0.82)",
      line: "rgba(138, 220, 255, 0.26)",
      storm: "#6ff7ff",
      danger: "#ff6f8b",
      gold: "#ffd56b",
      canvasTint: 0x7bbfd8
    }
  },
  {
    name: "Auric Verge",
    orbTarget: ORB_QUOTA_TARGET,
    enemies: ["missileer", "carrier", "minelayer"],
    theme: {
      name: "Auric Verge",
      accent: "#ffd56b",
      bgTop: "#4b3111",
      bgBottom: "#120904",
      panel: "rgba(31, 22, 10, 0.82)",
      line: "rgba(255, 214, 129, 0.28)",
      storm: "#ffd56b",
      danger: "#ff7a5a",
      gold: "#fff1a8",
      canvasTint: 0xf3c76e
    }
  },
  {
    name: "Viridian Halo",
    orbTarget: ORB_QUOTA_TARGET,
    enemies: ["interceptor", "leech", "jammer"],
    theme: {
      name: "Viridian Halo",
      accent: "#7df5a7",
      bgTop: "#123824",
      bgBottom: "#04140b",
      panel: "rgba(8, 25, 16, 0.84)",
      line: "rgba(145, 255, 196, 0.24)",
      storm: "#8af8c7",
      danger: "#ff7c97",
      gold: "#e5ff8d",
      canvasTint: 0x7fe7aa
    }
  },
  {
    name: "Violet Break",
    orbTarget: ORB_QUOTA_TARGET,
    enemies: ["shieldfrigate", "splitter", "harpoon"],
    theme: {
      name: "Violet Break",
      accent: "#c38bff",
      bgTop: "#281846",
      bgBottom: "#0b0617",
      panel: "rgba(19, 12, 35, 0.84)",
      line: "rgba(213, 180, 255, 0.25)",
      storm: "#d9a1ff",
      danger: "#ff7fba",
      gold: "#ffd2ff",
      canvasTint: 0xb88dff
    }
  },
  {
    name: "Crimson Reach",
    orbTarget: ORB_QUOTA_TARGET,
    enemies: ["cloak", "swarm", "siege"],
    theme: {
      name: "Crimson Reach",
      accent: "#ff7e7e",
      bgTop: "#491515",
      bgBottom: "#110506",
      panel: "rgba(34, 11, 13, 0.84)",
      line: "rgba(255, 167, 167, 0.24)",
      storm: "#ff9b9b",
      danger: "#ff5f74",
      gold: "#ffe19a",
      canvasTint: 0xff9191
    }
  }
];

const CHUNK_SIZE = 900;
const CHUNK_RADIUS = 1;
function getSystemDefinition(index: number): SolarSystemDefinition {
  return SOLAR_SYSTEMS[Math.min(index, SOLAR_SYSTEMS.length - 1)];
}

function getSystemOrbTarget(meta: MetaState): number {
  return getSystemDefinition(meta.systemIndex).orbTarget;
}

function getCurrentSystemTheme(meta: MetaState): SystemTheme {
  return getSystemDefinition(meta.systemIndex).theme;
}

function getSystemEnemyPool(meta: MetaState): EnemyKind[] {
  const system = getSystemDefinition(meta.systemIndex);
  const localRun = meta.runsInSystem + 1;
  return system.enemies.filter((_, index) => localRun >= (index === 0 ? 1 : index === 1 ? 2 : MIN_SYSTEM_RUNS));
}

function isJumpReady(meta: MetaState): boolean {
  return isSystemJumpReady({
    deliveredOrbs: meta.deliveredOrbs,
    runsInSystem: meta.runsInSystem,
    orbTarget: getSystemOrbTarget(meta),
    minimumRuns: MIN_SYSTEM_RUNS
  });
}

function createId(): number {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function length(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vector2): Vector2 {
  const magnitude = length(vector);
  if (magnitude <= 0.0001) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function getSystemStatLevel(meta: MetaState, key: SystemStatKey): number {
  return meta.systemBuild.stats[key];
}

function getClassFamily(currentClass: string): "courier" | "twinframe" | "longshot" | "drone" | "bulwark" {
  if (["Twinframe", "Splitfire", "Gatling", "Broadside", "Vulcan"].includes(currentClass)) {
    return "twinframe";
  }
  if (["Longshot", "Railcaster", "Missile Rack", "Beam Lancer", "Siege Boat"].includes(currentClass)) {
    return "longshot";
  }
  if (["Drone Bay", "Overseer", "Swarm Carrier", "Command Core", "Hive Carrier"].includes(currentClass)) {
    return "drone";
  }
  if (["Bulwark", "Trapper", "Ramship", "Fortress", "Juggernaut"].includes(currentClass)) {
    return "bulwark";
  }
  return "courier";
}

function getClassProfile(currentClass: string): {
  speedMultiplier?: number;
  fireCooldownMultiplier?: number;
  projectileSpeedBonus?: number;
  projectileDamageBonus?: number;
  penetrationBonus?: number;
  bodyDamageMultiplier?: number;
  hullBonus?: number;
  damageReduction?: number;
  spreadAngles?: number[];
  muzzleOffsets?: number[];
  projectileRadius?: number;
  projectileTtl?: number;
  cameraZoom?: number;
  weakGun?: boolean;
  droneWeapon?: boolean;
} {
  switch (currentClass) {
    case "Twinframe":
      return { muzzleOffsets: [-12, 12], spreadAngles: [0, 0] };
    case "Longshot":
      return {
        projectileSpeedBonus: -40,
        projectileDamageBonus: 1.2,
        projectileRadius: 12,
        projectileTtl: 1.5,
        fireCooldownMultiplier: 1.18,
        cameraZoom: 0.92
      };
    case "Drone Bay":
      return { droneWeapon: true, cameraZoom: 1 };
    case "Bulwark":
      return {
        hullBonus: 28,
        speedMultiplier: 0.9,
        bodyDamageMultiplier: 1.3,
        damageReduction: 0.08,
        weakGun: true,
        projectileDamageBonus: -0.35,
        fireCooldownMultiplier: 1.25
      };
    case "Splitfire":
      return { spreadAngles: [-0.22, 0, 0.22] };
    case "Gatling":
    case "Vulcan":
      return { fireCooldownMultiplier: currentClass === "Vulcan" ? 0.55 : 0.7, projectileDamageBonus: currentClass === "Vulcan" ? 0.9 : 0.3 };
    case "Railcaster":
    case "Beam Lancer":
      return {
        projectileSpeedBonus: currentClass === "Beam Lancer" ? 260 : 180,
        projectileDamageBonus: currentClass === "Beam Lancer" ? 1.6 : 1.1,
        penetrationBonus: currentClass === "Beam Lancer" ? 3 : 2,
        fireCooldownMultiplier: 1.18
      };
    case "Missile Rack":
    case "Siege Boat":
      return {
        spreadAngles: currentClass === "Siege Boat" ? [-0.18, 0, 0.18] : [-0.1, 0.1],
        projectileDamageBonus: currentClass === "Siege Boat" ? 1.2 : 0.7,
        fireCooldownMultiplier: 1.05
      };
    case "Overseer":
    case "Swarm Carrier":
    case "Command Core":
    case "Hive Carrier":
      return {
        spreadAngles: currentClass === "Command Core" ? [-0.18, 0, 0.18] : [-0.28, -0.08, 0.08, 0.28],
        projectileSpeedBonus: 80,
        fireCooldownMultiplier: currentClass === "Command Core" ? 0.9 : 1
      };
    case "Trapper":
    case "Fortress":
      return { hullBonus: currentClass === "Fortress" ? 40 : 18, speedMultiplier: 0.88, bodyDamageMultiplier: 1.18, damageReduction: 0.1 };
    case "Ramship":
    case "Juggernaut":
      return {
        hullBonus: currentClass === "Juggernaut" ? 48 : 26,
        speedMultiplier: currentClass === "Juggernaut" ? 0.92 : 0.96,
        bodyDamageMultiplier: currentClass === "Juggernaut" ? 1.75 : 1.45,
        damageReduction: currentClass === "Juggernaut" ? 0.16 : 0.1
      };
    default:
      return { spreadAngles: [0] };
  }
}

function getUnlockedClassTier(meta: MetaState): 2 | 3 | 4 {
  return meta.permanentUpgrades.classMatrix >= 2 ? 4 : meta.permanentUpgrades.classMatrix >= 1 ? 3 : 2;
}

function getBaseSpeed(meta: MetaState): number {
  const base = 168 + meta.permanentUpgrades.cruiseThrusters * 8;
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return base * (profile.speedMultiplier ?? 1);
}

function getMaxHull(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return 100 + getSystemStatLevel(meta, "maxHealth") * 14 + (profile.hullBonus ?? 0);
}

function getHealthRegen(meta: MetaState): number {
  return getSystemStatLevel(meta, "healthRegen") * 0.45;
}

function getScanRange(meta: MetaState): number {
  return 280 + meta.permanentUpgrades.scanSuite * 60;
}

function getScanCooldown(meta: MetaState): number {
  return Math.max(2, 4.6 - meta.permanentUpgrades.scanSuite * 0.35);
}

function getFireCooldown(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  if (profile.droneWeapon) {
    return Number.POSITIVE_INFINITY;
  }
  const base = Math.max(0.09, 0.54 - getSystemStatLevel(meta, "reload") * 0.038);
  return base * (profile.fireCooldownMultiplier ?? 1);
}

function getFireRate(meta: MetaState): number {
  if (getClassProfile(meta.systemBuild.currentClass).droneWeapon) {
    return 1 / getPlayerDroneReloadCooldown(meta);
  }
  const cooldown = getFireCooldown(meta);
  return Number.isFinite(cooldown) ? 1 / cooldown : 0;
}

function getProjectileSpeed(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return 520 + getSystemStatLevel(meta, "bulletSpeed") * 34 + (profile.projectileSpeedBonus ?? 0);
}

function getProjectileDamage(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return Math.max(0.4, 1 + getSystemStatLevel(meta, "bulletDamage") * 0.65 + (profile.projectileDamageBonus ?? 0));
}

function getProjectilePenetration(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return 1 + getSystemStatLevel(meta, "bulletPenetration") + (profile.penetrationBonus ?? 0);
}

function getBodyDamage(meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return (10 + getSystemStatLevel(meta, "bodyDamage") * 4) * (profile.bodyDamageMultiplier ?? 1);
}

function getPlayerDroneMaxHp(meta: MetaState): number {
  return 18 + getSystemStatLevel(meta, "maxHealth") * 3;
}

function getPlayerDroneReloadCooldown(meta: MetaState): number {
  return Math.max(0.55, 3.1 - getSystemStatLevel(meta, "reload") * 0.24);
}

function getInsuranceFactor(meta: MetaState): number {
  return 0.2 + meta.permanentUpgrades.insuranceCore * 0.06;
}

function getHarvestDuration(duration: number, meta: MetaState): number {
  return Math.max(0.55, duration * (1 - meta.permanentUpgrades.harvesterRig * 0.08));
}

function getSalvageValue(value: number, meta: MetaState): number {
  return Math.round(value * (1 + meta.permanentUpgrades.orbAppraisal * 0.14));
}

function getDamageTaken(amount: number, meta: MetaState): number {
  const profile = getClassProfile(meta.systemBuild.currentClass);
  return Math.max(1, Math.round(amount * (1 - (profile.damageReduction ?? 0))));
}

function getEnemyScale(meta: MetaState): number {
  return 1 + meta.systemIndex * 0.34 + Math.max(0, meta.runsInSystem - 1) * 0.08;
}

function getCurrentScanRange(meta: MetaState, run: RunState): number {
  const base = getScanRange(meta);
  const activeJammers = run.enemies.filter((enemy) => enemy.kind === "jammer" && distance(enemy, run.player) <= 520).length;
  return Math.max(120, base - activeJammers * 90);
}

function isEnemyShielded(target: EnemyState, run: RunState): boolean {
  if (target.kind === "shieldfrigate") {
    return false;
  }
  return run.enemies.some(
    (enemy) => enemy.kind === "shieldfrigate" && enemy.hp > 0 && enemy.id !== target.id && distance(enemy, target) <= 240
  );
}

function distanceToSegment(point: Vector2, start: Vector2, end: Vector2): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= 0.0001) {
    return distance(point, start);
  }

  const t = clamp(((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared, 0, 1);
  const closest = {
    x: start.x + segmentX * t,
    y: start.y + segmentY * t
  };
  return distance(point, closest);
}

function setMessage(run: RunState, text: string, duration: number): void {
  run.message = text;
  run.messageTimer = duration;
}

function getLootTemplate(
  distanceFromShip: number,
  prospectingRank: number
): Omit<RunState["nodes"][number], "id" | "x" | "y" | "scanned" | "harvested"> {
  const band = Math.max(0, Math.floor((distanceFromShip - 1200) / 1200));
  const rarityRoll = Math.random();
  let rarity: "common" | "rare" | "artifact" = "common";
  const artifactChance = Math.min(0.55, Math.max(0, band - 2) * 0.05 + prospectingRank * 0.03);
  const rareChance = Math.min(0.82, 0.12 + Math.max(0, band - 1) * 0.1 + prospectingRank * 0.05);

  if (rarityRoll < artifactChance) {
    rarity = "artifact";
  } else if (rarityRoll < rareChance) {
    rarity = "rare";
  }

  const distanceScale = 1 + band * 0.58;
  if (rarity === "artifact") {
    return {
      rarity,
      cargo: 1,
      value: Math.round(126 * distanceScale + band * 28),
      harvestDuration: Math.min(5.2, 2.8 + band * 0.08)
    };
  }

  if (rarity === "rare") {
    return {
      rarity,
      cargo: 1,
      value: Math.round(64 * distanceScale + band * 18),
      harvestDuration: Math.min(4.4, 2.1 + band * 0.06)
    };
  }

  return {
    rarity,
    cargo: 1,
    value: Math.round(20 * distanceScale + band * 7),
    harvestDuration: Math.min(3.7, 1.5 + band * 0.05)
  };
}

function spawnDebris(run: RunState): DebrisState {
  const collapseBoost = Math.min(1.8, run.collapseElapsed * 0.14);
  const intensity = run.stormIntensity + collapseBoost;
  const radius = randomRange(10, 24 + intensity * 14);
  const speed = randomRange(180, 260) + intensity * 235;
  const spawnX = clamp(run.player.x + randomRange(760, 1160), 80, run.width - 80);
  const spawnY = clamp(run.player.y + randomRange(-560, 560), 80, run.height - 80);
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    x: spawnX,
    y: spawnY,
    vx: -speed,
    vy: randomRange(-30, 30),
    radius,
    rotation: randomRange(0, Math.PI * 2),
    spin: randomRange(-2.6, 2.6),
    damage: Math.round(4 + intensity * 10 + radius * 0.18)
  };
}

function buildEnemyState(
  meta: MetaState,
  base: Omit<EnemyState, "id" | "x" | "y" | "vx" | "vy" | "stunTimer" | "attackCooldown" | "projectileCooldown" | "abilityCooldown" | "summonCooldown" | "chargeTimer" | "chargeAimX" | "chargeAimY">,
  x: number,
  y: number
): EnemyState {
  const scale = getEnemyScale(meta);
  return {
    id: createId(),
    kind: base.kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.max(2, Math.ceil(base.hp * scale)),
    maxHp: Math.max(2, Math.ceil(base.maxHp * scale)),
    touchDamage: Math.max(1, Math.round(base.touchDamage * (1 + meta.systemIndex * 0.12))),
    preferredRange: base.preferredRange,
    stunTimer: 0,
    attackCooldown: 0,
    projectileCooldown: 0,
    abilityCooldown: 0,
    summonCooldown: 0,
    chargeTimer: 0,
    chargeAimX: x,
    chargeAimY: y
  };
}

function createEnemyState(kind: EnemyKind, x: number, y: number, meta: MetaState): EnemyState {
  if (kind === "carrier") {
    return {
      ...buildEnemyState(
        meta,
        {
          kind,
          hp: 48,
          maxHp: 48,
          touchDamage: 22,
          preferredRange: 320
        },
        x,
        y
      ),
      kind,
      projectileCooldown: 0,
      abilityCooldown: 7.5,
      summonCooldown: 6.5,
      chargeTimer: 0
    };
  }

  if (kind === "siege") {
    return {
      ...buildEnemyState(meta, { kind, hp: 14, maxHp: 14, touchDamage: 14, preferredRange: 520 }, x, y),
      abilityCooldown: 3.8,
      projectileCooldown: 0
    };
  }

  if (kind === "shieldfrigate") {
    return buildEnemyState(meta, { kind, hp: 10, maxHp: 10, touchDamage: 12, preferredRange: 240 }, x, y);
  }

  if (kind === "missileer") {
    return {
      ...buildEnemyState(meta, { kind, hp: 7, maxHp: 7, touchDamage: 12, preferredRange: 340 }, x, y),
      projectileCooldown: 2.8,
    };
  }

  if (kind === "shooter") {
    return {
      ...buildEnemyState(meta, { kind, hp: 4, maxHp: 4, touchDamage: 10, preferredRange: 250 }, x, y),
      projectileCooldown: 1.35,
    };
  }

  if (kind === "hunter") {
    return buildEnemyState(meta, { kind, hp: 5, maxHp: 5, touchDamage: 17, preferredRange: 0 }, x, y);
  }

  if (kind === "minelayer") {
    return {
      ...buildEnemyState(meta, { kind, hp: 6, maxHp: 6, touchDamage: 12, preferredRange: 260 }, x, y),
      projectileCooldown: 2.4,
    };
  }

  if (kind === "interceptor") {
    return {
      ...buildEnemyState(meta, { kind, hp: 4, maxHp: 4, touchDamage: 18, preferredRange: 0 }, x, y),
      abilityCooldown: 2.1,
    };
  }

  if (kind === "leech") {
    return {
      ...buildEnemyState(meta, { kind, hp: 5, maxHp: 5, touchDamage: 9, preferredRange: 90 }, x, y),
      abilityCooldown: 1.4,
    };
  }

  if (kind === "jammer") {
    return {
      ...buildEnemyState(meta, { kind, hp: 6, maxHp: 6, touchDamage: 8, preferredRange: 340 }, x, y),
      projectileCooldown: 1.9,
    };
  }

  if (kind === "splitter") {
    return buildEnemyState(meta, { kind, hp: 8, maxHp: 8, touchDamage: 14, preferredRange: 0 }, x, y);
  }

  if (kind === "harpoon") {
    return {
      ...buildEnemyState(meta, { kind, hp: 7, maxHp: 7, touchDamage: 11, preferredRange: 300 }, x, y),
      abilityCooldown: 2.8,
    };
  }

  if (kind === "cloak") {
    return {
      ...buildEnemyState(meta, { kind, hp: 5, maxHp: 5, touchDamage: 13, preferredRange: 160 }, x, y),
      abilityCooldown: 2.4,
    };
  }

  if (kind === "swarm") {
    return buildEnemyState(meta, { kind, hp: 4, maxHp: 4, touchDamage: 10, preferredRange: 0 }, x, y);
  }

  return buildEnemyState(meta, { kind: "drone", hp: 3, maxHp: 3, touchDamage: 11, preferredRange: 0 }, x, y);
}

function spawnEnemy(run: RunState, meta: MetaState, forcedKind?: EnemyKind): EnemyState {
  const pool = getSystemEnemyPool(meta);
  const weightedPool: EnemyKind[] = [...pool, ...pool.slice(0, 1)];
  const kind = forcedKind ?? weightedPool[Math.floor(Math.random() * weightedPool.length)] ?? pool[0] ?? "drone";
  const angle = randomRange(0, Math.PI * 2);
  const radius = kind === "carrier" ? randomRange(620, 920) : randomRange(520, 860);
  const point = {
    x: clamp(run.player.x + Math.cos(angle) * radius, 80, run.width - 80),
    y: clamp(run.player.y + Math.sin(angle) * radius, 80, run.height - 80)
  };

  return createEnemyState(kind, point.x, point.y, meta);
}

function getSplitterSpawnKinds(meta: MetaState): [EnemyKind, EnemyKind] {
  const spawnPool = getSystemEnemyPool(meta).filter((kind) => kind !== "splitter");
  const firstKind = spawnPool[0] ?? "drone";
  const secondKind = spawnPool[1] ?? firstKind;
  return [firstKind, secondKind];
}

function finalizeRun(meta: MetaState, run: RunState, outcome: Exclude<RunOutcome, "running">): RunSummary {
  const extractedOrbs = outcome === "extracted" ? run.player.cargo : 0;
  const extractedValue = outcome === "extracted" ? run.player.cargoValue : 0;
  const insurance = outcome === "extracted" ? 0 : Math.floor(run.player.cargoValue * getInsuranceFactor(meta));
  const payout = extractedValue + insurance;
  const currentSystem = getSystemDefinition(meta.systemIndex);

  meta.runsInSystem += 1;
  meta.deliveredOrbs += extractedOrbs;
  meta.credits += payout;
  meta.bestTake = Math.max(meta.bestTake, payout);
  const jumpReady = isJumpReady(meta);

  if (outcome === "extracted") {
    return {
      outcome,
      title: jumpReady ? "Jump Route Locked" : "Orb Transfer Complete",
      subtitle: jumpReady
        ? `The courier ship has enough harvested orbs to leave ${currentSystem.name}. Launch again to jump to the next system.`
        : `Orbs transferred aboard. Keep hauling until the convoy banks ${getSystemOrbTarget(meta)} delivered orbs over at least ${MIN_SYSTEM_RUNS} runs.`,
      extractedOrbs,
      cargoValue: run.player.cargoValue,
      payout,
      insurance,
      extractedValue,
      shipsRemaining: meta.shipsRemaining,
      fullReset: false,
      jumpReady,
      nextSystemName: jumpReady ? getSystemDefinition(meta.systemIndex + 1).name : null
    };
  }

  return {
    outcome,
    title: outcome === "destroyed" ? "Skiff Lost" : "Storm Collapse",
    subtitle:
      outcome === "destroyed"
        ? "Your insurer recovered partial telemetry and paid a small insurance payout."
        : "The debris field swallowed the lane before docking, but your recorder still had some value.",
    extractedOrbs,
    cargoValue: run.player.cargoValue,
    payout,
    insurance,
    extractedValue,
    shipsRemaining: meta.shipsRemaining,
    fullReset: false,
    jumpReady,
    nextSystemName: jumpReady ? getSystemDefinition(meta.systemIndex + 1).name : null
  };
}

export class GameController {
  private meta: MetaState = createDefaultMeta();

  private run: RunState = createRunState(this.meta);
  private menuScreen: MenuScreen = "title";
  private summary: RunSummary | null = null;
  private listeners = new Set<() => void>();
  private effects: EffectEvent[] = [];
  private generatedChunks = new Set<string>();
  private nextEntityId = 1000;

  constructor() {
    this.resetGeneratedField();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getSnapshot(): HudSnapshot {
    const activeHarvest =
      this.run.player.harvestingNodeId === null
        ? null
        : this.run.nodes.find((node) => node.id === this.run.player.harvestingNodeId) ?? null;
    const harvestProgress =
      activeHarvest && this.run.player.harvestDurationTotal > 0
        ? 1 - this.run.player.harvestTimer / this.run.player.harvestDurationTotal
        : null;

    return {
      meta: this.meta,
      run: this.run,
      menu: {
        screen: this.menuScreen,
        enemies: this.getEnemyCodexEntries(),
        solarSystems: this.getSolarSystemCodexEntries()
      },
      systemTheme: getCurrentSystemTheme(this.meta),
      systemOrbTarget: getSystemOrbTarget(this.meta),
      jumpReady: isJumpReady(this.meta),
      scanRange: getCurrentScanRange(this.meta, this.run),
      cruiseSpeed:
        getBaseSpeed(this.meta) *
        getCarrySpeedMultiplier(this.run.player.cargo, this.meta.permanentUpgrades.massStabilizers),
      fireRate: getFireRate(this.meta),
      availableSystemPoints: this.meta.systemBuild.points,
      systemStatOffers: SYSTEM_STAT_OFFERS.map((offer) => ({
        ...offer,
        label: offer.label,
        level: this.meta.systemBuild.stats[offer.key]
      })),
      classBranchPrompt: this.getClassBranchPrompt(),
      harvestProgress,
      harvestRemaining: activeHarvest ? this.run.player.harvestTimer : null,
      harvestLabel: activeHarvest ? `${activeHarvest.rarity} cache` : null,
      summary: this.summary,
      upgradeOffers: this.getUpgradeOffers()
    };
  }

  consumeEffects(): EffectEvent[] {
    const next = [...this.effects];
    this.effects.length = 0;
    return next;
  }

  private getClassBranchPrompt(): ClassBranchPrompt | null {
    const tier = this.meta.systemBuild.pendingBranchTier;
    if (!tier) {
      return null;
    }

    const sourceClass = this.meta.systemBuild.currentClass;
    const available = CLASS_TREE[sourceClass]?.[tier] ?? [];
    if (available.length === 0) {
      return null;
    }

    const unlockedTier = getUnlockedClassTier(this.meta);
    return {
      tier,
      options: available.map((option) => ({
        id: option,
        label: option,
        description: CLASS_DESCRIPTIONS[option] ?? "Specialized evolution path.",
        locked: tier > unlockedTier,
        lockedReason: tier > unlockedTier ? `Tier ${tier} requires Class Matrix Lv ${tier - 2}.` : undefined
      }))
    };
  }

  private buildPlayerDrone(active = true): RunState["playerDrone"] {
    return {
      active,
      x: this.run.player.x + this.run.player.facingX * 34,
      y: this.run.player.y + this.run.player.facingY * 34,
      vx: this.run.player.facingX * 180,
      vy: this.run.player.facingY * 180,
      hp: getPlayerDroneMaxHp(this.meta),
      maxHp: getPlayerDroneMaxHp(this.meta),
      radius: 16,
      cooldown: 0,
      reserves: 0,
      maxReserves: 0
    };
  }

  private syncPlayerDroneLoadout(): void {
    if (getClassFamily(this.meta.systemBuild.currentClass) !== "drone") {
      this.run.playerDrone = null;
      return;
    }

    if (!this.run.playerDrone) {
      this.run.playerDrone = this.buildPlayerDrone(true);
      return;
    }

    const drone = this.run.playerDrone;
    const nextMaxHp = getPlayerDroneMaxHp(this.meta);
    drone.maxHp = nextMaxHp;
    drone.hp = Math.min(drone.hp, nextMaxHp);
  }

  private getUpgradeOffers(): UpgradeOffer[] {
    return PERMANENT_UPGRADE_DEFS.map((definition) => {
      const level = this.meta.permanentUpgrades[definition.key];
      const cost = getPermanentUpgradeCost(definition.key, level);
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        level,
        cost,
        affordable: this.meta.credits >= cost
      };
    });
  }

  private getEnemyCodexEntries(): EnemyCodexEntry[] {
    return Object.values(ENEMY_CODEX);
  }

  private getSolarSystemCodexEntries(): SolarSystemCodexEntry[] {
    return SOLAR_SYSTEMS.map((system) => ({
      name: system.name,
      theme: system.theme,
      enemies: system.enemies.map((kind) => ENEMY_CODEX[kind].name) as [string, string, string]
    }));
  }

  openMenu(screen: MenuScreen): void {
    this.menuScreen = screen;
    this.emit();
  }

  startGameFromMenu(): void {
    if (this.menuScreen === "hidden") {
      return;
    }
    this.menuScreen = "hidden";
    this.emit();
  }

  purchaseUpgrade(key: PermanentUpgradeKey): boolean {
    if (!this.summary) {
      return false;
    }

    const level = this.meta.permanentUpgrades[key];
    const cost = getPermanentUpgradeCost(key, level);
    if (this.meta.credits < cost) {
      return false;
    }

    this.meta.credits -= cost;
    this.meta.permanentUpgrades[key] += 1;
    this.emit();
    return true;
  }

  spendSystemPoint(key: SystemStatKey): boolean {
    if (this.summary || this.meta.systemBuild.pendingBranchTier !== null || this.meta.systemBuild.points <= 0) {
      return false;
    }

    this.meta.systemBuild.points -= 1;
    this.meta.systemBuild.spentPoints += 1;
    this.meta.systemBuild.stats[key] += 1;
    if (getClassFamily(this.meta.systemBuild.currentClass) === "drone" && (key === "reload" || key === "maxHealth")) {
      this.syncPlayerDroneLoadout();
    }
    this.checkForPendingBranch();
    this.emit();
    return true;
  }

  chooseClassBranch(nextClassId: string): boolean {
    const prompt = this.getClassBranchPrompt();
    if (!prompt) {
      return false;
    }

    const option = prompt.options.find((candidate) => candidate.id === nextClassId && !candidate.locked);
    if (!option) {
      return false;
    }

    this.meta.systemBuild.currentClass = option.id;
    this.meta.systemBuild.classTier = prompt.tier;
    this.meta.systemBuild.classPath.push(option.id);
    this.meta.systemBuild.pendingBranchTier = null;
    this.syncPlayerDroneLoadout();
    setMessage(this.run, `${option.label} chassis online. Keep pushing deeper into the system.`, 2.4);
    this.emit();
    return true;
  }

  dismissClassBranch(): void {
    if (this.meta.systemBuild.pendingBranchTier === null) {
      return;
    }
    const tier = this.meta.systemBuild.pendingBranchTier;
    this.meta.systemBuild.pendingBranchTier = null;
    setMessage(this.run, `Tier ${tier} evolution is blocked until you improve the Class Matrix.`, 2.6);
    this.emit();
  }

  startNextRun(): void {
    const fullReset = this.summary?.fullReset ?? false;
    const jumpReady = this.summary?.jumpReady ?? false;
    this.summary = null;
    this.menuScreen = "hidden";
    if (!fullReset) {
      this.meta.runNumber += 1;
    }
    if (!fullReset && jumpReady) {
      this.meta.systemIndex += 1;
      this.meta.runsInSystem = 0;
      this.meta.deliveredOrbs = 0;
      this.meta.systemBuild = createDefaultSystemBuild();
    }
    this.run = createRunState(this.meta);
    this.resetGeneratedField();
    this.checkForPendingBranch();
    this.emit();
  }

  private checkForPendingBranch(): void {
    if (this.meta.systemBuild.pendingBranchTier !== null) {
      return;
    }
    if (this.meta.systemBuild.classTier < 2 && this.meta.systemBuild.spentPoints >= CLASS_THRESHOLDS[2]) {
      this.meta.systemBuild.pendingBranchTier = 2;
      return;
    }
    if (this.meta.systemBuild.classTier < 3 && this.meta.systemBuild.spentPoints >= CLASS_THRESHOLDS[3]) {
      this.meta.systemBuild.pendingBranchTier = 3;
      return;
    }
    if (this.meta.systemBuild.classTier < 4 && this.meta.systemBuild.spentPoints >= CLASS_THRESHOLDS[4]) {
      this.meta.systemBuild.pendingBranchTier = 4;
    }
  }

  private resetGeneratedField(): void {
    this.generatedChunks.clear();
    const currentMaxId = Math.max(
      0,
      ...this.run.nodes.map((node) => node.id),
      ...this.run.pickups.map((pickup) => pickup.id)
    );
    this.nextEntityId = currentMaxId + 1;
    const extractionChunkKey = this.getChunkKey(this.run.extraction.x, this.run.extraction.y);
    this.generatedChunks.add(extractionChunkKey);
    this.ensureChunksAround(this.run.player.x, this.run.player.y);
  }

  private allocateId(): number {
    const next = this.nextEntityId;
    this.nextEntityId += 1;
    return next;
  }

  private getChunkKey(x: number, y: number): string {
    return `${Math.floor(x / CHUNK_SIZE)}:${Math.floor(y / CHUNK_SIZE)}`;
  }

  private ensureChunksAround(x: number, y: number): void {
    const baseChunkX = Math.floor(x / CHUNK_SIZE);
    const baseChunkY = Math.floor(y / CHUNK_SIZE);

    for (let offsetX = -CHUNK_RADIUS; offsetX <= CHUNK_RADIUS; offsetX += 1) {
      for (let offsetY = -CHUNK_RADIUS; offsetY <= CHUNK_RADIUS; offsetY += 1) {
        const chunkX = baseChunkX + offsetX;
        const chunkY = baseChunkY + offsetY;
        if (chunkX < 0 || chunkY < 0) {
          continue;
        }

        const key = `${chunkX}:${chunkY}`;
        if (this.generatedChunks.has(key)) {
          continue;
        }

        this.generatedChunks.add(key);
        this.generateChunk(chunkX, chunkY);
      }
    }
  }

  private generateChunk(chunkX: number, chunkY: number): void {
    const run = this.run;
    const minX = chunkX * CHUNK_SIZE + 120;
    const maxX = Math.min(run.width - 120, (chunkX + 1) * CHUNK_SIZE - 120);
    const minY = chunkY * CHUNK_SIZE + 120;
    const maxY = Math.min(run.height - 120, (chunkY + 1) * CHUNK_SIZE - 120);

    if (minX >= maxX || minY >= maxY) {
      return;
    }

    const chunkCenter = {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.5
    };
    const distanceFromShip = distance(chunkCenter, run.extraction);
    if (distanceFromShip < 1200) {
      return;
    }

    const band = Math.max(0, Math.floor((distanceFromShip - 1200) / 1200));
    const baseNodeCount = distanceFromShip < 2600 ? 1 : 2;
    const nodeCount = Math.min(4, baseNodeCount + Math.floor(Math.random() * 2) + Math.floor(band / 4));

    for (let index = 0; index < nodeCount; index += 1) {
      const x = randomRange(minX, maxX);
      const y = randomRange(minY, maxY);
      const loot = getLootTemplate(distance({ x, y }, run.extraction), this.meta.permanentUpgrades.prospectingArray);
      run.nodes.push({
        id: this.allocateId(),
        x,
        y,
        scanned: distanceFromShip < 2200,
        harvested: false,
        ...loot
      });
    }
  }

  private spawnProjectile(run: RunState, direction: Vector2): void {
    const shotDirection = normalize(direction);
    const baseAngle = Math.atan2(shotDirection.y, shotDirection.x);
    const profile = getClassProfile(this.meta.systemBuild.currentClass);
    if (profile.droneWeapon) {
      return;
    }
    const spreadAngles = profile.spreadAngles ?? [0];
    const muzzleOffsets = profile.muzzleOffsets ?? [0];
    const speed = getProjectileSpeed(this.meta);
    const damage = getProjectileDamage(this.meta);
    const hp = getProjectilePenetration(this.meta);
    const radius = profile.projectileRadius ?? 8;
    const ttl = profile.projectileTtl ?? 1.05;

    for (let index = 0; index < spreadAngles.length; index += 1) {
      const spread = spreadAngles[index] ?? 0;
      const muzzleOffset = muzzleOffsets[Math.min(index, muzzleOffsets.length - 1)] ?? 0;
      const angle = baseAngle + spread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const lateralX = -Math.sin(baseAngle) * muzzleOffset;
      const lateralY = Math.cos(baseAngle) * muzzleOffset;
      run.projectiles.push({
        id: createId(),
        owner: "player",
        kind: "bolt",
        x: run.player.x + Math.cos(angle) * 24 + lateralX,
        y: run.player.y + Math.sin(angle) * 24 + lateralY,
        vx,
        vy,
        speed,
        homingStrength: 0,
        ttl,
        radius,
        damage,
        hp
      });
    }
    run.player.fireCooldown = getFireCooldown(this.meta);
    this.effects.push({ type: "shot", x: run.player.x, y: run.player.y, radius: 18 });
  }

  private spawnEnemyProjectile(run: RunState, enemy: EnemyState, kind: ProjectileState["kind"], direction: Vector2): void {
    const shotDirection = normalize(direction);
    let speed = 360;
    let ttl = 2.2;
    let radius = 8;
    let damage = 9;
    let homingStrength = 0;
    let hp = 1;

    if (kind === "missile") {
      speed = 255;
      ttl = 5.2;
      radius = 11;
      damage = 18;
      homingStrength = 2.5;
      hp = 2;
    } else if (kind === "mine") {
      speed = 90;
      ttl = 12;
      radius = 14;
      damage = 16;
      hp = 2;
    } else if (kind === "artillery") {
      speed = 0;
      ttl = 0.95;
      radius = 42;
      damage = 20;
      hp = 99;
    } else if (kind === "laser") {
      speed = 880;
      ttl = 0.95;
      radius = 12;
      damage = 24;
    }

    run.projectiles.push({
      id: createId(),
      owner: "enemy",
      kind,
      x: enemy.x + shotDirection.x * 34,
      y: enemy.y + shotDirection.y * 34,
      vx: shotDirection.x * speed,
      vy: shotDirection.y * speed,
      speed,
      homingStrength,
      ttl,
      radius,
      damage,
      hp
    });

    this.effects.push({ type: "shot", x: enemy.x, y: enemy.y, radius: kind === "laser" ? 44 : 26 });
  }

  private damagePlayer(run: RunState, amount: number, source: Vector2, message: string, invuln = 0.6): void {
    const player = run.player;
    if (player.invulnTimer > 0) {
      return;
    }

    const adjustedDamage = getDamageTaken(amount, this.meta);
    player.hull = Math.max(0, player.hull - adjustedDamage);
    player.invulnTimer = invuln;
    const shove = normalize({ x: source.x - player.x, y: source.y - player.y });
    player.vx -= shove.x * 120;
    player.vy -= shove.y * 120;
    setMessage(run, message.replace(`${amount}`, `${adjustedDamage}`), 2.1);
    this.effects.push({ type: "damage", x: player.x, y: player.y, radius: 42 });
  }

  private spawnCarrierWave(run: RunState, carrier: EnemyState): void {
    const waveKinds = getSystemEnemyPool(this.meta).filter((kind) => kind !== "carrier");
    const summonKinds: EnemyKind[] = waveKinds.length > 0 ? waveKinds : ["drone"];
    const spawnCount = 2 + Math.floor(Math.random() * 2);

    for (let index = 0; index < spawnCount; index += 1) {
      const kind = summonKinds[Math.floor(Math.random() * summonKinds.length)] ?? "drone";
      const angle = (Math.PI * 2 * index) / spawnCount + randomRange(-0.4, 0.4);
      const radius = randomRange(70, 120);
      const x = clamp(carrier.x + Math.cos(angle) * radius, 60, run.width - 60);
      const y = clamp(carrier.y + Math.sin(angle) * radius, 60, run.height - 60);
      run.enemies.push(createEnemyState(kind, x, y, this.meta));
    }

    setMessage(run, "Carrier bay breached. Hostile wave launching.", 2.5);
    this.effects.push({ type: "storm", x: carrier.x, y: carrier.y, radius: 120 });
  }

  private spawnMine(run: RunState, enemy: EnemyState): void {
    const awayFromPlayer = normalize({ x: enemy.x - run.player.x, y: enemy.y - run.player.y });
    this.spawnEnemyProjectile(run, enemy, "mine", awayFromPlayer.x === 0 && awayFromPlayer.y === 0 ? { x: 1, y: 0 } : awayFromPlayer);
  }

  private spawnSystemPointPickup(run: RunState, enemy: EnemyState, amount: number): void {
    run.pickups.push({
      id: this.allocateId(),
      kind: "system",
      x: clamp(enemy.x + randomRange(-18, 18), 32, run.width - 32),
      y: clamp(enemy.y + randomRange(-18, 18), 32, run.height - 32),
      amount
    });
  }

  private spawnArtillery(run: RunState, target: Vector2): void {
    const clampedTarget = {
      x: clamp(target.x, 60, run.width - 60),
      y: clamp(target.y, 60, run.height - 60)
    };
    run.projectiles.push({
      id: createId(),
      owner: "enemy",
      kind: "artillery",
      x: clampedTarget.x,
      y: clampedTarget.y,
      vx: 0,
      vy: 0,
      speed: 0,
      homingStrength: 0,
      ttl: 0.95,
      radius: 44,
      damage: 22,
      hp: 99
    });
    this.effects.push({
      type: "artillery-warning",
      x: clampedTarget.x,
      y: clampedTarget.y,
      radius: 44,
      durationMs: 950
    });
  }

  private fireHarpoon(run: RunState, enemy: EnemyState): void {
    this.effects.push({
      type: "harpoon",
      x: enemy.x,
      y: enemy.y,
      x2: run.player.x,
      y2: run.player.y,
      durationMs: 260
    });
    this.damagePlayer(run, 9, enemy, "Harpoon hit: -9. Thrusters dragged off line.", 0.48);
    const pull = normalize({ x: enemy.x - run.player.x, y: enemy.y - run.player.y });
    run.player.vx += pull.x * 180;
    run.player.vy += pull.y * 180;
  }

  private getEnemyBodyRadius(enemy: EnemyState): number {
    switch (enemy.kind) {
      case "carrier":
        return 34;
      case "shieldfrigate":
      case "siege":
        return 22;
      case "hunter":
      case "splitter":
        return 18;
      case "swarm":
        return 12;
      default:
        return 14;
    }
  }

  private getEnemyLabel(enemy: EnemyState): string {
    return ENEMY_CODEX[enemy.kind].name;
  }

  private handleRunLoss(outcome: "destroyed" | "storm"): void {
    this.meta.shipsRemaining -= 1;

    if (this.meta.shipsRemaining <= 0) {
      const lostCargo = this.run.player.cargoValue;
      this.meta = createDefaultMeta();
      this.summary = {
        outcome,
        title: "Fleet Lost",
        subtitle: "All three ships were lost. Your fleet charter, credits, and upgrades were wiped and reset to the alpha baseline.",
        extractedOrbs: 0,
        cargoValue: lostCargo,
        payout: 0,
        insurance: 0,
        extractedValue: 0,
        shipsRemaining: this.meta.shipsRemaining,
        fullReset: true
      };
      return;
    }

    this.summary = finalizeRun(this.meta, this.run, outcome);
    this.summary.shipsRemaining = this.meta.shipsRemaining;
  }

  update(dt: number, input: FrameInput): void {
    if (this.menuScreen !== "hidden") {
      return;
    }
    if (this.summary) {
      return;
    }
    if (this.meta.systemBuild.pendingBranchTier !== null) {
      return;
    }

    const run = this.run;
    const player = run.player;

    run.elapsed += dt;
    const previousTimeLeft = run.timeLeft;
    run.timeLeft = Math.max(0, run.timeLeft - dt);
    if (run.timeLeft <= 0) {
      run.collapseElapsed += dt;
    }
    run.stormIntensity = 1 - run.timeLeft / run.duration + Math.min(1.6, run.collapseElapsed * 0.12);
    run.wave = 1 + Math.floor(run.elapsed / 35);

    if (previousTimeLeft > 0 && run.timeLeft === 0) {
      setMessage(run, "The debris wall is rolling in now. Dock is still open, but getting back will only get harder.", 3.2);
      this.effects.push({ type: "storm", x: player.x, y: player.y, radius: 240 });
    }

    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.scanCooldown = Math.max(0, player.scanCooldown - dt);
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.maxHull = getMaxHull(this.meta);
    player.hull = clamp(player.hull + getHealthRegen(this.meta) * dt, 0, player.maxHull);
    this.syncPlayerDroneLoadout();

    if (run.messageTimer > 0) {
      run.messageTimer = Math.max(0, run.messageTimer - dt);
      if (run.messageTimer === 0) {
        run.message =
          run.timeLeft <= 0
            ? "The dock is still open, but the debris field only gets denser from here."
            : "Harvest orbs, bank them aboard the courier ship, and push the quota toward the next jump.";
      }
    }

    const moveVector = normalize({ x: input.moveX, y: input.moveY });
    const aimInput = normalize({ x: input.aimX, y: input.aimY });
    const harvestingNode =
      player.harvestingNodeId === null
        ? null
        : run.nodes.find((node) => node.id === player.harvestingNodeId) ?? null;

    const harvestingSlow = harvestingNode ? 0.35 : 1;
    const carrySpeedMultiplier = getCarrySpeedMultiplier(player.cargo, this.meta.permanentUpgrades.massStabilizers);
    const moveSpeed = getBaseSpeed(this.meta) * carrySpeedMultiplier;
    const desiredVelocity = {
      x: moveVector.x * moveSpeed * harvestingSlow,
      y: moveVector.y * moveSpeed * harvestingSlow
    };

    player.vx = lerp(player.vx, desiredVelocity.x, Math.min(1, dt * 7.5));
    player.vy = lerp(player.vy, desiredVelocity.y, Math.min(1, dt * 7.5));
    if (moveVector.x === 0 && moveVector.y === 0) {
      player.vx *= Math.max(0, 1 - dt * 4.4);
      player.vy *= Math.max(0, 1 - dt * 4.4);
    }

    if (moveVector.x !== 0 || moveVector.y !== 0) {
      player.facingX = moveVector.x;
      player.facingY = moveVector.y;
    }

    if (aimInput.x !== 0 || aimInput.y !== 0) {
      player.facingX = aimInput.x;
      player.facingY = aimInput.y;
    }

    player.x = clamp(player.x + player.vx * dt, 42, run.width - 42);
    player.y = clamp(player.y + player.vy * dt, 42, run.height - 42);
    this.ensureChunksAround(player.x, player.y);

    if (run.playerDrone) {
      const drone = run.playerDrone;
      if (drone.active) {
        const previousX = drone.x;
        const previousY = drone.y;
        const targetEnemy = [...run.enemies].sort((left, right) => distance(left, drone) - distance(right, drone))[0] ?? null;
        const desiredTarget = targetEnemy
          ? { x: targetEnemy.x, y: targetEnemy.y }
          : { x: player.x + player.facingX * 72, y: player.y + player.facingY * 72 };
        const toTarget = normalize({ x: desiredTarget.x - drone.x, y: desiredTarget.y - drone.y });
        const droneSpeed = targetEnemy ? 310 + getSystemStatLevel(this.meta, "bulletSpeed") * 20 : 220;
        drone.vx = toTarget.x * droneSpeed;
        drone.vy = toTarget.y * droneSpeed;
        drone.x = clamp(drone.x + drone.vx * dt, 24, run.width - 24);
        drone.y = clamp(drone.y + drone.vy * dt, 24, run.height - 24);
        if (!targetEnemy && distance(drone, desiredTarget) <= 12) {
          drone.vx = 0;
          drone.vy = 0;
        }
        drone.vx = (drone.x - previousX) / Math.max(dt, 0.0001);
        drone.vy = (drone.y - previousY) / Math.max(dt, 0.0001);
      } else {
        drone.cooldown = Math.max(0, drone.cooldown - dt);
        if (drone.cooldown === 0) {
          drone.active = true;
          drone.hp = drone.maxHp;
          drone.vx = player.facingX * 180;
          drone.vy = player.facingY * 180;
          drone.x = player.x + player.facingX * 34;
          drone.y = player.y + player.facingY * 34;
          setMessage(run, "Drone relaunched from the bay.", 1.6);
        }
      }
    }

    if (input.shootHeld && player.fireCooldown <= 0) {
      const shotDirection =
        aimInput.x !== 0 || aimInput.y !== 0
          ? aimInput
          : moveVector.x !== 0 || moveVector.y !== 0
            ? moveVector
            : normalize({ x: player.facingX, y: player.facingY });
      this.spawnProjectile(run, shotDirection);
    }

    if (input.scanPressed && player.scanCooldown <= 0) {
      const scanRange = getCurrentScanRange(this.meta, run);
      let revealed = 0;
      for (const node of run.nodes) {
        if (!node.scanned && !node.harvested && distance(player, node) <= scanRange) {
          node.scanned = true;
          revealed += 1;
        }
      }
      player.scanCooldown = getScanCooldown(this.meta);
      setMessage(
        run,
        revealed > 0 ? `Scan resolved ${revealed} salvage pings.` : "Scan ping clear. No fresh signatures nearby.",
        2.8
      );
      this.effects.push({ type: "scan", x: player.x, y: player.y, radius: scanRange });
    }

    if (input.interactPressed) {
      const atGate = distance(player, run.extraction) <= run.extraction.radius + 26;
      if (atGate && player.cargoValue > 0) {
        run.outcome = "extracted";
        this.summary = finalizeRun(this.meta, run, "extracted");
        this.effects.push({ type: "extract", x: run.extraction.x, y: run.extraction.y, radius: run.extraction.radius });
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
      } else {
        setMessage(run, "Nothing to harvest here. Move onto a revealed orb cache or dock with the courier ship, then press E.", 2.3);
      }
    }

    const activeHarvest =
      player.harvestingNodeId === null
        ? null
        : run.nodes.find((node) => node.id === player.harvestingNodeId) ?? null;

    if (activeHarvest) {
      if (distance(player, activeHarvest) > 112) {
        player.harvestingNodeId = null;
        player.harvestTimer = 0;
        player.harvestDurationTotal = 0;
        setMessage(run, "Harvest link snapped. Reconnect to finish the pull.", 2.3);
      } else {
        player.harvestTimer = Math.max(0, player.harvestTimer - dt);
        if (player.harvestTimer === 0) {
          activeHarvest.harvested = true;
          player.harvestingNodeId = null;
          player.harvestDurationTotal = 0;
          player.cargo += activeHarvest.cargo;
          player.cargoValue += getSalvageValue(activeHarvest.value, this.meta);
          setMessage(
            run,
            `${activeHarvest.rarity.toUpperCase()} orbs secured. ${player.cargo} orbs aboard worth ${player.cargoValue} credits.`,
            2.8
          );
          this.effects.push({ type: "harvest", x: activeHarvest.x, y: activeHarvest.y, radius: 54 });
        }
      }
    }

    for (const pickup of [...run.pickups]) {
      if (distance(player, pickup) > 34) {
        continue;
      }

      if (pickup.kind === "repair") {
        player.hull = clamp(player.hull + pickup.amount, 0, player.maxHull);
        setMessage(run, `Repair charge recovered ${pickup.amount} hull.`, 2);
      } else {
        this.meta.systemBuild.points += pickup.amount;
        setMessage(run, `Recovered ${pickup.amount} system point${pickup.amount === 1 ? "" : "s"}.`, 1.8);
      }

      this.effects.push({ type: "pickup", x: pickup.x, y: pickup.y, radius: 44 });
      run.pickups = run.pickups.filter((entry) => entry.id !== pickup.id);
    }

    run.spawnTimer -= dt;
    run.carrierSpawnCooldown -= dt;
    const distancePressure = Math.floor(distance(player, run.extraction) / 1600);
    const pressureProfile = getEnemyPressureProfile({
      timeLeft: run.timeLeft,
      duration: run.duration,
      distancePressure,
      wave: run.wave
    });
    const carrierPresent = run.enemies.some((enemy) => enemy.kind === "carrier");
    const nonCarrierEnemies = () => run.enemies.filter((enemy) => enemy.kind !== "carrier").length;

    const systemPool = getSystemEnemyPool(this.meta);

    if (systemPool.includes("carrier") && !carrierPresent && run.carrierSpawnCooldown <= 0) {
      run.enemies.push(spawnEnemy(run, this.meta, "carrier"));
      run.carrierSpawnCooldown = randomRange(26, 38);
      setMessage(run, "Heavy carrier signature inbound. Expect launch waves and beam fire.", 2.8);
    }

    while (run.spawnTimer <= 0 && nonCarrierEnemies() < pressureProfile.maxEnemies) {
      const room = pressureProfile.maxEnemies - nonCarrierEnemies();
      const spawnCount = Math.max(1, Math.min(pressureProfile.spawnBurst, room));
      for (let index = 0; index < spawnCount; index += 1) {
        run.enemies.push(spawnEnemy(run, this.meta));
      }
      run.spawnTimer += randomRange(pressureProfile.spawnIntervalMin, pressureProfile.spawnIntervalMax);
    }

    run.debrisSpawnTimer -= dt;
    while (run.debrisSpawnTimer <= 0) {
      run.debris.push(spawnDebris(run));
      const collapsePenalty = Math.min(0.42, run.collapseElapsed * 0.035);
      run.debrisSpawnTimer += clamp(1.1 - run.stormIntensity * 0.9 - collapsePenalty + Math.random() * 0.18, 0.045, 1.2);
    }

    const survivingEnemies: EnemyState[] = [];
    for (const enemy of run.enemies) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.projectileCooldown = Math.max(0, enemy.projectileCooldown - dt);
      enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - dt);
      enemy.summonCooldown = Math.max(0, enemy.summonCooldown - dt);

      if (enemy.chargeTimer > 0) {
        enemy.chargeTimer = Math.max(0, enemy.chargeTimer - dt);
        enemy.vx *= Math.max(0, 1 - dt * 6);
        enemy.vy *= Math.max(0, 1 - dt * 6);
        if (enemy.chargeTimer === 0) {
          const beamDirection = normalize({ x: enemy.chargeAimX - enemy.x, y: enemy.chargeAimY - enemy.y });
          const beamEnd = {
            x: clamp(enemy.x + beamDirection.x * 1400, 0, run.width),
            y: clamp(enemy.y + beamDirection.y * 1400, 0, run.height)
          };
          this.effects.push({
            type: "laser-fire",
            x: enemy.x,
            y: enemy.y,
            x2: beamEnd.x,
            y2: beamEnd.y,
            radius: 46,
            durationMs: 180
          });
          if (distanceToSegment(player, enemy, beamEnd) <= 34) {
            this.damagePlayer(run, 28, enemy, "Carrier laser hit: -28.", 0.85);
          }
          setMessage(run, "Carrier laser discharged. Break the beam lane and keep firing.", 2);
        }
      } else if (enemy.stunTimer > 0) {
        enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
        enemy.vx *= Math.max(0, 1 - dt * 3.2);
        enemy.vy *= Math.max(0, 1 - dt * 3.2);
      } else {
        const toPlayer = normalize({ x: player.x - enemy.x, y: player.y - enemy.y });
        const playerDistance = distance(enemy, player);
        const strafe = { x: -toPlayer.y, y: toPlayer.x };
        let desiredVelocity = { x: 0, y: 0 };

        switch (enemy.kind) {
          case "hunter":
            desiredVelocity = {
              x: toPlayer.x * 164,
              y: toPlayer.y * 164
            };
            break;
          case "interceptor":
            desiredVelocity = {
              x: toPlayer.x * 188,
              y: toPlayer.y * 188
            };
            if (enemy.abilityCooldown <= 0) {
              enemy.vx = toPlayer.x * 360;
              enemy.vy = toPlayer.y * 360;
              enemy.abilityCooldown = 2.6;
            }
            break;
          case "shooter":
            desiredVelocity =
              playerDistance < enemy.preferredRange - 20
                ? { x: -toPlayer.x * 118 + strafe.x * 42, y: -toPlayer.y * 118 + strafe.y * 42 }
                : playerDistance > enemy.preferredRange + 40
                  ? { x: toPlayer.x * 126 + strafe.x * 36, y: toPlayer.y * 126 + strafe.y * 36 }
                  : { x: strafe.x * 94, y: strafe.y * 94 };
            if (enemy.projectileCooldown <= 0 && playerDistance < 520) {
              this.spawnEnemyProjectile(run, enemy, "bolt", toPlayer);
              enemy.projectileCooldown = 1.45;
            }
            break;
          case "jammer":
            desiredVelocity =
              playerDistance > enemy.preferredRange
                ? { x: toPlayer.x * 102 + strafe.x * 26, y: toPlayer.y * 102 + strafe.y * 26 }
                : { x: strafe.x * 92, y: strafe.y * 92 };
            if (enemy.projectileCooldown <= 0 && playerDistance < 480) {
              this.spawnEnemyProjectile(run, enemy, "bolt", toPlayer);
              enemy.projectileCooldown = 2;
            }
            break;
          case "missileer":
            desiredVelocity =
              playerDistance < enemy.preferredRange - 40
                ? { x: -toPlayer.x * 104 + strafe.x * 38, y: -toPlayer.y * 104 + strafe.y * 38 }
                : playerDistance > enemy.preferredRange + 30
                  ? { x: toPlayer.x * 108 + strafe.x * 38, y: toPlayer.y * 108 + strafe.y * 38 }
                  : { x: strafe.x * 82, y: strafe.y * 82 };
            if (enemy.projectileCooldown <= 0 && playerDistance < 700) {
              this.spawnEnemyProjectile(run, enemy, "missile", toPlayer);
              enemy.projectileCooldown = 3.6;
              setMessage(run, "Missile lock detected. Shoot the seeker or outrun it.", 1.7);
            }
            break;
          case "minelayer":
            desiredVelocity =
              playerDistance < enemy.preferredRange
                ? { x: -toPlayer.x * 112 + strafe.x * 76, y: -toPlayer.y * 112 + strafe.y * 76 }
                : { x: strafe.x * 108, y: strafe.y * 108 };
            if (enemy.projectileCooldown <= 0) {
              this.spawnMine(run, enemy);
              enemy.projectileCooldown = 2.5;
            }
            break;
          case "leech":
            desiredVelocity = {
              x: toPlayer.x * 142,
              y: toPlayer.y * 142
            };
            if (playerDistance < 150 && enemy.abilityCooldown <= 0) {
              this.damagePlayer(run, 6, enemy, "Leech drone latched onto the hull: -6.", 0.45);
              enemy.abilityCooldown = 1.7;
            }
            break;
          case "shieldfrigate":
            desiredVelocity =
              playerDistance < enemy.preferredRange
                ? { x: -toPlayer.x * 84 + strafe.x * 52, y: -toPlayer.y * 84 + strafe.y * 52 }
                : { x: strafe.x * 76, y: strafe.y * 76 };
            if (enemy.projectileCooldown <= 0 && playerDistance < 420) {
              this.spawnEnemyProjectile(run, enemy, "bolt", toPlayer);
              enemy.projectileCooldown = 2.25;
            }
            break;
          case "splitter":
            desiredVelocity = {
              x: toPlayer.x * 128 + strafe.x * 24,
              y: toPlayer.y * 128 + strafe.y * 24
            };
            break;
          case "harpoon":
            desiredVelocity =
              playerDistance < enemy.preferredRange
                ? { x: -toPlayer.x * 92 + strafe.x * 44, y: -toPlayer.y * 92 + strafe.y * 44 }
                : { x: toPlayer.x * 106, y: toPlayer.y * 106 };
            if (enemy.abilityCooldown <= 0 && playerDistance < 460) {
              this.fireHarpoon(run, enemy);
              enemy.abilityCooldown = 3.2;
            }
            break;
          case "cloak":
            desiredVelocity =
              playerDistance > 180
                ? { x: toPlayer.x * 126 + strafe.x * 52, y: toPlayer.y * 126 + strafe.y * 52 }
                : { x: strafe.x * 122, y: strafe.y * 122 };
            if (enemy.abilityCooldown <= 0) {
              enemy.vx += strafe.x * 160;
              enemy.vy += strafe.y * 160;
              enemy.abilityCooldown = 2.8;
            }
            break;
          case "swarm":
            desiredVelocity = {
              x: toPlayer.x * 154 + Math.sin((run.elapsed + enemy.id) * 3.5) * 74,
              y: toPlayer.y * 154 + Math.cos((run.elapsed + enemy.id) * 3.5) * 74
            };
            break;
          case "siege":
            desiredVelocity =
              playerDistance < enemy.preferredRange
                ? { x: -toPlayer.x * 74 + strafe.x * 28, y: -toPlayer.y * 74 + strafe.y * 28 }
                : { x: strafe.x * 42, y: strafe.y * 42 };
            if (enemy.abilityCooldown <= 0 && playerDistance < 760) {
              this.spawnArtillery(run, { x: player.x + player.vx * 0.5, y: player.y + player.vy * 0.5 });
              enemy.abilityCooldown = 4.4;
              setMessage(run, "Artillery lock incoming. Move off the marker.", 1.7);
            }
            break;
          case "carrier":
            desiredVelocity =
              playerDistance > enemy.preferredRange
                ? { x: toPlayer.x * 84, y: toPlayer.y * 84 }
                : { x: strafe.x * 52, y: strafe.y * 52 };
            if (enemy.summonCooldown <= 0) {
              this.spawnCarrierWave(run, enemy);
              enemy.summonCooldown = randomRange(8, 12);
            }
            if (enemy.abilityCooldown <= 0 && playerDistance < 720) {
              enemy.chargeTimer = 1.35;
              enemy.chargeAimX = player.x;
              enemy.chargeAimY = player.y;
              enemy.abilityCooldown = 8.8;
              this.effects.push({
                type: "laser-charge",
                x: enemy.x,
                y: enemy.y,
                x2: player.x,
                y2: player.y,
                radius: 84,
                durationMs: 1350
              });
              setMessage(run, "Carrier beam charging. Move before the laser lane opens.", 1.7);
            }
            break;
          default:
            desiredVelocity = { x: toPlayer.x * 122, y: toPlayer.y * 122 };
            break;
        }

        enemy.vx = lerp(enemy.vx, desiredVelocity.x, Math.min(1, dt * 2.8));
        enemy.vy = lerp(enemy.vy, desiredVelocity.y, Math.min(1, dt * 2.8));
      }

      enemy.x = clamp(enemy.x + enemy.vx * dt, 16, run.width - 16);
      enemy.y = clamp(enemy.y + enemy.vy * dt, 16, run.height - 16);

      const bodyRadius = this.getEnemyBodyRadius(enemy);
      if (run.playerDrone?.active && distance(enemy, run.playerDrone) <= bodyRadius + run.playerDrone.radius) {
        enemy.hp -= Math.max(1, Math.round(getProjectileDamage(this.meta) * 1.25));
        run.playerDrone.hp = Math.max(0, run.playerDrone.hp - Math.max(4, enemy.touchDamage));
        run.playerDrone.vx *= -0.4;
        run.playerDrone.vy *= -0.4;
        this.effects.push({ type: "damage", x: run.playerDrone.x, y: run.playerDrone.y, radius: 28 });
        if (run.playerDrone.hp <= 0) {
          run.playerDrone.active = false;
          run.playerDrone.cooldown = getPlayerDroneReloadCooldown(this.meta);
          setMessage(run, "Attack drone destroyed. Reload cycling a replacement frame.", 1.8);
        }
      }

      if (distance(enemy, player) <= bodyRadius + 20 && enemy.attackCooldown <= 0) {
        this.damagePlayer(run, enemy.touchDamage, enemy, `Hull breach: -${enemy.touchDamage}. Hostiles are all over your lane.`, 0.7);
        enemy.hp -= Math.max(1, Math.round(getBodyDamage(this.meta) * 0.18));
        enemy.attackCooldown = enemy.kind === "carrier" ? 1.5 : 1.05;
        enemy.stunTimer = 0.35;
      }

      if (enemy.hp > 0) {
        survivingEnemies.push(enemy);
      } else {
        const pointDropAmount = getEnemyPointDropAmount(enemy.kind);
        if (pointDropAmount > 0) {
          this.spawnSystemPointPickup(run, enemy, pointDropAmount);
        }
        if (enemy.kind === "splitter") {
          const [firstSpawnKind, secondSpawnKind] = getSplitterSpawnKinds(this.meta);
          run.enemies.push(createEnemyState(firstSpawnKind, clamp(enemy.x - 18, 20, run.width - 20), clamp(enemy.y - 12, 20, run.height - 20), this.meta));
          run.enemies.push(createEnemyState(secondSpawnKind, clamp(enemy.x + 18, 20, run.width - 20), clamp(enemy.y + 12, 20, run.height - 20), this.meta));
        }
        setMessage(
          run,
          pointDropAmount > 0
            ? `${this.getEnemyLabel(enemy)} destroyed. Collect the dropped point${pointDropAmount === 1 ? "" : "s"}.`
            : `${this.getEnemyLabel(enemy)} destroyed.`,
          2
        );
        if (enemy.kind === "carrier") {
          run.carrierSpawnCooldown = randomRange(30, 42);
        }
      }
    }
    run.enemies = survivingEnemies;

    const survivingProjectiles: ProjectileState[] = [];
    for (const projectile of run.projectiles) {
      if (projectile.owner === "enemy" && projectile.kind === "missile") {
        const towardPlayer = normalize({ x: player.x - projectile.x, y: player.y - projectile.y });
        projectile.vx = lerp(projectile.vx, towardPlayer.x * projectile.speed, Math.min(1, dt * projectile.homingStrength));
        projectile.vy = lerp(projectile.vy, towardPlayer.y * projectile.speed, Math.min(1, dt * projectile.homingStrength));
      } else if (projectile.owner === "enemy" && projectile.kind === "mine") {
        projectile.vx *= Math.max(0, 1 - dt * 3.2);
        projectile.vy *= Math.max(0, 1 - dt * 3.2);
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.ttl -= dt;

      if (
        projectile.ttl <= 0 ||
        projectile.x < -20 ||
        projectile.x > run.width + 20 ||
        projectile.y < -20 ||
        projectile.y > run.height + 20
      ) {
        continue;
      }

      if (projectile.owner === "player") {
        let hitProjectile: ProjectileState | null = null;
        for (const target of run.projectiles) {
          if (
            target.owner === "enemy" &&
            (target.kind === "missile" || target.kind === "mine") &&
            distance(projectile, target) <= projectile.radius + target.radius
          ) {
            hitProjectile = target;
            break;
          }
        }

        if (hitProjectile) {
          hitProjectile.hp -= projectile.damage;
          projectile.hp -= 1;
          this.effects.push({ type: "damage", x: projectile.x, y: projectile.y, radius: 20 });
          if (hitProjectile.hp <= 0) {
            hitProjectile.ttl = 0;
            setMessage(run, "Seeker missile destroyed mid-flight.", 1.4);
          }
          if (projectile.hp > 0) {
            survivingProjectiles.push(projectile);
          }
          continue;
        }

        let hitEnemy: EnemyState | null = null;
        for (const enemy of run.enemies) {
          const hitRadius = this.getEnemyBodyRadius(enemy);
          if (distance(projectile, enemy) <= projectile.radius + hitRadius) {
            hitEnemy = enemy;
            break;
          }
        }

        if (hitEnemy) {
          const damage = isEnemyShielded(hitEnemy, run) ? Math.max(1, Math.ceil(projectile.damage * 0.5)) : projectile.damage;
          hitEnemy.hp -= damage;
          hitEnemy.stunTimer = Math.max(hitEnemy.stunTimer, hitEnemy.kind === "carrier" ? 0.08 : 0.18);
          projectile.hp -= 1;
          this.effects.push({ type: "damage", x: projectile.x, y: projectile.y, radius: 22 });
          if (projectile.hp > 0) {
            survivingProjectiles.push(projectile);
          }
          continue;
        }

        survivingProjectiles.push(projectile);
        continue;
      }

      if (projectile.kind === "artillery") {
        if (projectile.ttl <= 0.02) {
          this.effects.push({ type: "artillery-blast", x: projectile.x, y: projectile.y, radius: projectile.radius + 8, durationMs: 260 });
          if (distance(projectile, player) <= projectile.radius + 18) {
            this.damagePlayer(run, projectile.damage, projectile, `Artillery blast: -${projectile.damage}.`, 0.7);
          }
          continue;
        }
        survivingProjectiles.push(projectile);
        continue;
      }

      if (distance(projectile, player) <= projectile.radius + 18) {
        const label =
          projectile.kind === "laser"
            ? "Carrier laser hit"
            : projectile.kind === "missile"
              ? "Missile impact"
              : projectile.kind === "mine"
                ? "Mine detonation"
                : "Enemy shot hit";
        this.damagePlayer(run, projectile.damage, projectile, `${label}: -${projectile.damage}.`, projectile.kind === "laser" ? 0.8 : 0.55);
        this.effects.push({ type: "damage", x: projectile.x, y: projectile.y, radius: projectile.kind === "mine" ? 32 : projectile.kind === "laser" ? 36 : 24 });
        continue;
      }

      survivingProjectiles.push(projectile);
    }
    run.projectiles = survivingProjectiles.filter((projectile) => projectile.ttl > 0 && projectile.hp > 0);

    const survivingDebris: DebrisState[] = [];
    for (const debris of run.debris) {
      debris.x += debris.vx * dt;
      debris.y += debris.vy * dt;
      debris.rotation += debris.spin * dt;

      if (debris.x < -debris.radius - 60 || debris.y < -80 || debris.y > run.height + 80) {
        continue;
      }

      if (distance(debris, player) <= debris.radius + 18 && player.invulnTimer <= 0) {
        this.damagePlayer(run, debris.damage, debris, `Debris impact: -${debris.damage}. The field is getting denser.`, run.timeLeft <= 0 ? 0.24 : 0.42);
        player.vx += debris.vx * 0.18;
        player.vy += debris.vy * 0.18;
        this.effects.push({ type: "damage", x: debris.x, y: debris.y, radius: debris.radius + 14 });
        continue;
      }

      survivingDebris.push(debris);
    }
    run.debris = survivingDebris;

    if (player.hull <= 0) {
      run.outcome = run.timeLeft <= 0 ? "storm" : "destroyed";
      this.handleRunLoss(run.timeLeft <= 0 ? "storm" : "destroyed");
      this.effects.push({ type: run.timeLeft <= 0 ? "storm" : "destroyed", x: player.x, y: player.y, radius: 180 });
      this.emit();
      return;
    }

    this.emit();
  }
}
