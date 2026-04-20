export type UpgradeKey = "cargo" | "scanner" | "thrusters" | "shield" | "weapon" | "reactor";

export interface UpgradeDefinition {
  key: UpgradeKey;
  label: string;
  description: string;
}

export interface MetaState {
  credits: number;
  runNumber: number;
  bestTake: number;
  upgrades: Record<UpgradeKey, number>;
}

export type LootRarity = "common" | "rare" | "artifact";
export type EnemyKind = "drone" | "hunter";
export type PickupKind = "repair" | "coolant" | "overdrive";
export type RunOutcome = "running" | "extracted" | "destroyed" | "storm";

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
  heat: number;
  harvestDuration: number;
}

export interface EnemyState extends Vector2 {
  id: number;
  kind: EnemyKind;
  vx: number;
  vy: number;
  hp: number;
  stunTimer: number;
  attackCooldown: number;
}

export interface PickupState extends Vector2 {
  id: number;
  kind: PickupKind;
  amount: number;
}

export interface ProjectileState extends Vector2 {
  id: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  damage: number;
}

export interface PlayerState extends Vector2 {
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hull: number;
  maxHull: number;
  heat: number;
  cargo: number;
  cargoValue: number;
  invulnTimer: number;
  scanCooldown: number;
  empCooldown: number;
  fireCooldown: number;
  overdriveTimer: number;
  harvestingNodeId: number | null;
  harvestTimer: number;
  harvestDurationTotal: number;
}

export interface ExtractionState extends Vector2 {
  radius: number;
}

export interface RunState {
  width: number;
  height: number;
  timeLeft: number;
  elapsed: number;
  stormIntensity: number;
  wave: number;
  outcome: RunOutcome;
  message: string;
  messageTimer: number;
  player: PlayerState;
  extraction: ExtractionState;
  nodes: SalvageNodeState[];
  enemies: EnemyState[];
  pickups: PickupState[];
  projectiles: ProjectileState[];
  spawnTimer: number;
}

export interface FrameInput {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  boostHeld: boolean;
  shootHeld: boolean;
  interactPressed: boolean;
  scanPressed: boolean;
  empPressed: boolean;
}

export interface EffectEvent {
  type: "scan" | "emp" | "harvest" | "damage" | "extract" | "destroyed" | "storm" | "shot" | "pickup";
  x: number;
  y: number;
  radius?: number;
}

export interface UpgradeOffer {
  key: UpgradeKey;
  level: number;
  cost: number;
  label: string;
  description: string;
  affordable: boolean;
}

export interface RunSummary {
  outcome: Exclude<RunOutcome, "running">;
  title: string;
  subtitle: string;
  cargoValue: number;
  payout: number;
  insurance: number;
  extractedValue: number;
}

export interface HudSnapshot {
  meta: MetaState;
  run: RunState;
  cargoCapacity: number;
  scanRange: number;
  boostSpeed: number;
  fireRate: number;
  harvestProgress: number | null;
  harvestRemaining: number | null;
  harvestLabel: string | null;
  summary: RunSummary | null;
  upgradeOffers: UpgradeOffer[];
}
