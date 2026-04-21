import type { LootRarity, MetaState, PickupState, RunState, SalvageNodeState } from "./types.ts";

const WORLD_WIDTH = 18000;
const WORLD_HEIGHT = 18000;
const RUN_DURATION = 300;

function getBaseHull(meta: MetaState): number {
  const classHullBonus =
    meta.systemBuild.currentClass === "Bulwark"
      ? 28
      : meta.systemBuild.currentClass === "Fortress"
        ? 40
        : meta.systemBuild.currentClass === "Ramship"
          ? 26
          : meta.systemBuild.currentClass === "Juggernaut"
            ? 48
            : 0;

  return 100 + meta.systemBuild.stats.maxHealth * 14 + classHullBonus;
}

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
      cargo: 1,
      value: 22,
      harvestDuration: 1.5
    },
    rare: {
      rarity,
      cargo: 1,
      value: 54,
      harvestDuration: 2.1
    },
    artifact: {
      rarity,
      cargo: 1,
      value: 110,
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

function createPickup(id: number, x: number, y: number, amount: number): PickupState {
  return {
    id,
    kind: "repair",
    x,
    y,
    amount
  };
}

function isDroneClass(currentClass: string): boolean {
  return ["Drone Bay", "Overseer", "Swarm Carrier", "Command Core", "Hive Carrier"].includes(currentClass);
}

function createPlayerDrone(meta: MetaState, x: number, y: number) {
  if (!isDroneClass(meta.systemBuild.currentClass)) {
    return null;
  }

  return {
    active: true,
    x,
    y: y - 44,
    vx: 0,
    vy: 0,
    hp: 18 + meta.systemBuild.stats.maxHealth * 3,
    maxHp: 18 + meta.systemBuild.stats.maxHealth * 3,
    radius: 16,
    cooldown: 0,
    reserves: 0,
    maxReserves: 0
  };
}

export function createRunState(meta: MetaState): RunState {
  const nodeCount = 3;
  const nodes = Array.from({ length: nodeCount }, (_, index) => createNode(index + 1));
  const playerStart = {
    x: WORLD_WIDTH * 0.5,
    y: WORLD_HEIGHT * 0.5 + 180
  };

  if (nodes[0]) {
    nodes[0] = {
      ...nodes[0],
      x: playerStart.x + 128,
      y: playerStart.y - 116,
      rarity: "common",
      cargo: 1,
      value: 24,
      harvestDuration: 1.25,
      scanned: true,
      harvested: false
    };
  }

  if (nodes[1]) {
    nodes[1] = {
      ...nodes[1],
      x: playerStart.x + 1280,
      y: playerStart.y - 760,
      rarity: "rare",
      cargo: 1,
      value: 72,
      harvestDuration: 2.2,
      scanned: false,
      harvested: false
    };
  }

  const pickups: PickupState[] = [
    createPickup(1, playerStart.x + 260, playerStart.y - 64, 18),
    createPickup(2, playerStart.x - 284, playerStart.y - 80, 14)
  ];

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
      hull: getBaseHull(meta),
      maxHull: getBaseHull(meta),
      cargo: 0,
      cargoValue: 0,
      invulnTimer: 0,
      scanCooldown: 0,
      fireCooldown: 0,
      harvestingNodeId: null,
      harvestTimer: 0,
      harvestDurationTotal: 0
    },
    playerDrone: createPlayerDrone(meta, playerStart.x, playerStart.y),
    extraction: {
      x: WORLD_WIDTH * 0.5,
      y: WORLD_HEIGHT * 0.5,
      radius: 88
    },
    nodes,
    enemies: [],
    pickups,
    projectiles: [],
    debris: [],
    spawnTimer: 2.2,
    debrisSpawnTimer: 1.15,
    carrierSpawnCooldown: 22
  };
}
