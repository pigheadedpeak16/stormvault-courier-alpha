export type PermanentUpgradeKey =
  | "scanSuite"
  | "harvesterRig"
  | "orbAppraisal"
  | "insuranceCore"
  | "massStabilizers"
  | "cruiseThrusters"
  | "prospectingArray"
  | "classMatrix";

export type SystemStatKey =
  | "healthRegen"
  | "maxHealth"
  | "bodyDamage"
  | "bulletSpeed"
  | "bulletPenetration"
  | "bulletDamage"
  | "reload";

export const SYSTEM_STAT_KEYS = [
  "healthRegen",
  "maxHealth",
  "bodyDamage",
  "bulletSpeed",
  "bulletPenetration",
  "bulletDamage",
  "reload"
] as const satisfies readonly SystemStatKey[];

export const PERMANENT_UPGRADE_KEYS = [
  "scanSuite",
  "harvesterRig",
  "orbAppraisal",
  "insuranceCore",
  "massStabilizers",
  "cruiseThrusters",
  "prospectingArray",
  "classMatrix"
] as const satisfies readonly PermanentUpgradeKey[];

export interface UpgradeDefinition {
  key: PermanentUpgradeKey;
  label: string;
  description: string;
}

export interface SystemBuildState {
  points: number;
  spentPoints: number;
  stats: Record<SystemStatKey, number>;
  currentClass: string;
  classTier: 1 | 2 | 3 | 4;
  classPath: string[];
  pendingBranchTier: 2 | 3 | 4 | null;
}

export interface MetaState {
  credits: number;
  runNumber: number;
  bestTake: number;
  shipsRemaining: number;
  systemIndex: number;
  runsInSystem: number;
  deliveredOrbs: number;
  permanentUpgrades: Record<PermanentUpgradeKey, number>;
  systemBuild: SystemBuildState;
}

export type LootRarity = "common" | "rare" | "artifact";
export type EnemyKind =
  | "drone"
  | "hunter"
  | "shooter"
  | "missileer"
  | "carrier"
  | "minelayer"
  | "interceptor"
  | "leech"
  | "jammer"
  | "shieldfrigate"
  | "splitter"
  | "harpoon"
  | "cloak"
  | "swarm"
  | "siege";
export type RunOutcome = "running" | "extracted" | "destroyed" | "storm";
export type ProjectileOwner = "player" | "enemy";
export type ProjectileKind = "bolt" | "missile" | "laser" | "mine" | "artillery";

export interface Vector2 {
  x: number;
  y: number;
}

export interface SalvageNodeState extends Vector2 {
  id: number;
  rarity: LootRarity;
  scanned: boolean;
  harvested: boolean;
  cargo: number;
  value: number;
  harvestDuration: number;
}

export interface EnemyState extends Vector2 {
  id: number;
  kind: EnemyKind;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  touchDamage: number;
  preferredRange: number;
  stunTimer: number;
  attackCooldown: number;
  projectileCooldown: number;
  abilityCooldown: number;
  summonCooldown: number;
  chargeTimer: number;
  chargeAimX: number;
  chargeAimY: number;
}

export interface PickupState extends Vector2 {
  id: number;
  kind: "repair" | "system";
  amount: number;
}

export interface ProjectileState extends Vector2 {
  id: number;
  owner: ProjectileOwner;
  kind: ProjectileKind;
  vx: number;
  vy: number;
  speed: number;
  homingStrength: number;
  ttl: number;
  radius: number;
  damage: number;
  hp: number;
}

export interface DebrisState extends Vector2 {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  spin: number;
  damage: number;
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

export interface PlayerDroneState extends Vector2 {
  active: boolean;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  cooldown: number;
  reserves: number;
  maxReserves: number;
}

export interface ExtractionState extends Vector2 {
  radius: number;
}

export interface RunState {
  width: number;
  height: number;
  duration: number;
  timeLeft: number;
  collapseElapsed: number;
  laneCollapsed: boolean;
  elapsed: number;
  stormIntensity: number;
  wave: number;
  outcome: RunOutcome;
  message: string;
  messageTimer: number;
  player: PlayerState;
  playerDrone: PlayerDroneState | null;
  extraction: ExtractionState;
  nodes: SalvageNodeState[];
  enemies: EnemyState[];
  pickups: PickupState[];
  projectiles: ProjectileState[];
  debris: DebrisState[];
  spawnTimer: number;
  debrisSpawnTimer: number;
  carrierSpawnCooldown: number;
}

export interface FrameInput {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  shootHeld: boolean;
  interactPressed: boolean;
  scanPressed: boolean;
}

export interface EffectEvent {
  type:
    | "scan"
    | "harvest"
    | "damage"
    | "extract"
    | "destroyed"
    | "storm"
    | "shot"
    | "pickup"
    | "laser-charge"
    | "laser-fire"
    | "artillery-warning"
    | "artillery-blast"
    | "harpoon";
  x: number;
  y: number;
  radius?: number;
  x2?: number;
  y2?: number;
  durationMs?: number;
}

export interface UpgradeOffer {
  key: PermanentUpgradeKey;
  level: number;
  cost: number;
  label: string;
  description: string;
  affordable: boolean;
}

export interface SystemStatOffer {
  key: SystemStatKey;
  label: string;
  hotkey: string;
  level: number;
}

export interface ClassBranchOption {
  id: string;
  label: string;
  description: string;
  locked: boolean;
  lockedReason?: string;
}

export interface ClassBranchPrompt {
  tier: 2 | 3 | 4;
  options: ClassBranchOption[];
}

export interface RunSummary {
  outcome: Exclude<RunOutcome, "running">;
  title: string;
  subtitle: string;
  extractedOrbs: number;
  cargoValue: number;
  payout: number;
  insurance: number;
  extractedValue: number;
  shipsRemaining: number;
  fullReset: boolean;
  jumpReady?: boolean;
  nextSystemName?: string | null;
}

export interface SystemTheme {
  name: string;
  accent: string;
  bgTop: string;
  bgBottom: string;
  panel: string;
  line: string;
  storm: string;
  danger: string;
  gold: string;
  canvasTint: number;
}

export type MenuScreen = "title" | "codex-enemies" | "codex-systems" | "tier3" | "hidden";

export interface EnemyCodexEntry {
  kind: EnemyKind;
  name: string;
  description: string;
  accent: string;
}

export interface SolarSystemCodexEntry {
  name: string;
  theme: SystemTheme;
  enemies: [string, string, string];
}

export interface MenuSnapshot {
  screen: MenuScreen;
  enemies: EnemyCodexEntry[];
  solarSystems: SolarSystemCodexEntry[];
}

export interface HudSnapshot {
  meta: MetaState;
  run: RunState;
  menu: MenuSnapshot;
  systemTheme: SystemTheme;
  systemOrbTarget: number;
  jumpReady: boolean;
  scanRange: number;
  cruiseSpeed: number;
  fireRate: number;
  availableSystemPoints: number;
  systemStatOffers: SystemStatOffer[];
  classBranchPrompt: ClassBranchPrompt | null;
  harvestProgress: number | null;
  harvestRemaining: number | null;
  harvestLabel: string | null;
  summary: RunSummary | null;
  upgradeOffers: UpgradeOffer[];
}
