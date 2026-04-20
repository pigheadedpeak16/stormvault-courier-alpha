import type { LootRarity, MetaState, PickupKind, PickupState, RunState, SalvageNodeState } from "./types";

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const RUN_DURATION = 135;

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomRarity(): LootRarity {
  const roll = Math.random();
  if (roll > 0.9) {
    return "artifact";
  }
  if (roll > 0.55) {
    return "rare";
  }
  return "common";
}

function createNode(id: number): SalvageNodeState {
  const rarity = randomRarity();
  const templates: Record<LootRarity, Omit<SalvageNodeState, "id" | "x" | "y" | "scanned" | "harvested">> = {
    common: {
      rarity,
      cargo: 2,
      value: 22,
      heat: 5,
      harvestDuration: 1.5
    },
    rare: {
      rarity,
      cargo: 3,
      value: 54,
      heat: 9,
      harvestDuration: 2.1
    },
    artifact: {
      rarity,
      cargo: 4,
      value: 110,
      heat: 14,
      harvestDuration: 2.8
    }
  };
  const template = templates[rarity];

  return {
    id,
    x: randomRange(220, WORLD_WIDTH - 220),
    y: randomRange(220, WORLD_HEIGHT - 220),
    scanned: false,
    harvested: false,
    ...template
  };
}

function createPickup(id: number, kind: PickupKind, x: number, y: number, amount: number): PickupState {
  return {
    id,
    kind,
    x,
    y,
    amount
  };
}

export function createRunState(meta: MetaState): RunState {
  const nodeCount = 8 + Math.min(5, meta.runNumber);
  const nodes = Array.from({ length: nodeCount }, (_, index) => createNode(index + 1));
  const playerStart = {
    x: WORLD_WIDTH * 0.5,
    y: WORLD_HEIGHT * 0.78
  };

  if (nodes[0]) {
    nodes[0] = {
      ...nodes[0],
      x: playerStart.x + 128,
      y: playerStart.y - 116,
      rarity: "common",
      cargo: 2,
      value: 24,
      heat: 4,
      harvestDuration: 1.25,
      scanned: true,
      harvested: false
    };
  }

  if (nodes[1]) {
    nodes[1] = {
      ...nodes[1],
      x: playerStart.x - 164,
      y: playerStart.y - 188,
      rarity: "rare",
      cargo: 3,
      value: 58,
      heat: 8,
      harvestDuration: 1.9,
      scanned: false,
      harvested: false
    };
  }

  const pickups: PickupState[] = [
    createPickup(1, "repair", playerStart.x + 260, playerStart.y - 64, 18),
    createPickup(2, "coolant", playerStart.x - 284, playerStart.y - 80, 30),
    createPickup(3, "overdrive", playerStart.x + 60, playerStart.y - 310, 6)
  ];

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    timeLeft: RUN_DURATION,
    elapsed: 0,
    stormIntensity: 0,
    wave: 1,
    outcome: "running",
    message: "Step 1: move to the nearby green cache. Step 2: press E to harvest. Step 3: watch the link meter finish. Step 4: dock with the courier ship and press E to bank cargo.",
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
      heat: 12,
      cargo: 0,
      cargoValue: 0,
      invulnTimer: 0,
      scanCooldown: 0,
      empCooldown: 0,
      fireCooldown: 0,
      overdriveTimer: 0,
      harvestingNodeId: null,
      harvestTimer: 0,
      harvestDurationTotal: 0
    },
    extraction: {
      x: WORLD_WIDTH * 0.5,
      y: WORLD_HEIGHT - 160,
      radius: 88
    },
    nodes,
    enemies: [],
    pickups,
    projectiles: [],
    spawnTimer: 2.2
  };
}
