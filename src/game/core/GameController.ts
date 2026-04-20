import { createRunState } from "./createRunState";
import type {
  EffectEvent,
  EnemyState,
  FrameInput,
  HudSnapshot,
  MetaState,
  PickupKind,
  ProjectileState,
  RunOutcome,
  RunState,
  RunSummary,
  UpgradeDefinition,
  UpgradeKey,
  UpgradeOffer,
  Vector2
} from "./types";

const UPGRADE_DEFS: UpgradeDefinition[] = [
  {
    key: "cargo",
    label: "Expanded Hold",
    description: "+4 cargo capacity per rank."
  },
  {
    key: "scanner",
    label: "Deep Scan Array",
    description: "Longer scan radius and faster pulse recovery."
  },
  {
    key: "thrusters",
    label: "Storm Thrusters",
    description: "Higher cruise speed, stronger boost, less heat strain."
  },
  {
    key: "shield",
    label: "Arc Shielding",
    description: "Higher hull and a safer rescue rebate when runs go bad."
  },
  {
    key: "weapon",
    label: "Pulse Blaster",
    description: "Faster firing cadence and higher shot damage."
  },
  {
    key: "reactor",
    label: "Flux Reactor",
    description: "Better heat recovery and stronger temporary powerups."
  }
];

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

function getBaseSpeed(meta: MetaState, overdriveTimer = 0): number {
  const speed = 168 + meta.upgrades.thrusters * 16;
  return overdriveTimer > 0 ? speed + 30 : speed;
}

function getBoostSpeed(meta: MetaState, overdriveTimer = 0): number {
  const speed = 282 + meta.upgrades.thrusters * 34;
  return overdriveTimer > 0 ? speed + 48 : speed;
}

function getCargoCapacity(meta: MetaState): number {
  return 16 + meta.upgrades.cargo * 4;
}

function getScanRange(meta: MetaState): number {
  return 280 + meta.upgrades.scanner * 65;
}

function getScanCooldown(meta: MetaState): number {
  return Math.max(2.4, 4.4 - meta.upgrades.scanner * 0.35);
}

function getEmpCooldown(): number {
  return 5.5;
}

function getFireCooldown(meta: MetaState, overdriveTimer = 0): number {
  const cooldown = Math.max(0.18, 0.52 - meta.upgrades.weapon * 0.05);
  return overdriveTimer > 0 ? cooldown * 0.65 : cooldown;
}

function getFireRate(meta: MetaState, overdriveTimer = 0): number {
  return 1 / getFireCooldown(meta, overdriveTimer);
}

function getProjectileDamage(meta: MetaState, overdriveTimer = 0): number {
  return 1 + meta.upgrades.weapon + (overdriveTimer > 0 ? 1 : 0);
}

function getUpgradeCost(level: number): number {
  return 55 + level * 45;
}

function getInsuranceFactor(meta: MetaState): number {
  return 0.2 + meta.upgrades.shield * 0.05;
}

function getHeatDecay(meta: MetaState): number {
  return 6.2 + meta.upgrades.thrusters * 0.35 + meta.upgrades.reactor * 0.65;
}

function getOverdriveDuration(meta: MetaState): number {
  return 5.5 + meta.upgrades.reactor * 0.75;
}

function setMessage(run: RunState, text: string, duration: number): void {
  run.message = text;
  run.messageTimer = duration;
}

function randomPickupKind(): PickupKind {
  const roll = Math.random();
  if (roll > 0.72) {
    return "overdrive";
  }
  if (roll > 0.4) {
    return "coolant";
  }
  return "repair";
}

function createPickup(id: number, kind: PickupKind, x: number, y: number, amount: number) {
  return { id, kind, x, y, amount };
}

function spawnEnemy(run: RunState): EnemyState {
  const roll = Math.random();
  const kind = roll > 0.72 || run.stormIntensity > 0.75 ? "hunter" : "drone";
  const edge = Math.floor(Math.random() * 4);
  const margin = 80;
  const point =
    edge === 0
      ? { x: margin, y: Math.random() * run.height }
      : edge === 1
        ? { x: run.width - margin, y: Math.random() * run.height }
        : edge === 2
          ? { x: Math.random() * run.width, y: margin }
          : { x: Math.random() * run.width, y: run.height - margin };

  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    kind,
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    hp: kind === "hunter" ? 5 : 3,
    stunTimer: 0,
    attackCooldown: 0
  };
}

function finalizeRun(meta: MetaState, run: RunState, outcome: Exclude<RunOutcome, "running">): RunSummary {
  const extractedValue = outcome === "extracted" ? run.player.cargoValue : 0;
  const insurance = outcome === "extracted" ? 0 : Math.floor(run.player.cargoValue * getInsuranceFactor(meta));
  const payout = extractedValue + insurance;

  meta.credits += payout;
  meta.bestTake = Math.max(meta.bestTake, payout);

  if (outcome === "extracted") {
    return {
      outcome,
      title: "Run Secured",
      subtitle: "The courier shuttle took your haul aboard and jumped before the storm sealed.",
      cargoValue: run.player.cargoValue,
      payout,
      insurance,
      extractedValue
    };
  }

  return {
    outcome,
    title: outcome === "destroyed" ? "Skiff Lost" : "Storm Collapse",
    subtitle:
      outcome === "destroyed"
        ? "The guild recovered partial telemetry and paid a rescue rebate."
        : "The sector sealed before docking, but your recorder still had some value.",
    cargoValue: run.player.cargoValue,
    payout,
    insurance,
    extractedValue
  };
}

export class GameController {
  private meta: MetaState = {
    credits: 0,
    runNumber: 1,
    bestTake: 0,
    upgrades: {
      cargo: 0,
      scanner: 0,
      thrusters: 0,
      shield: 0,
      weapon: 0,
      reactor: 0
    }
  };

  private run: RunState = createRunState(this.meta);
  private summary: RunSummary | null = null;
  private listeners = new Set<() => void>();
  private effects: EffectEvent[] = [];

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
      cargoCapacity: getCargoCapacity(this.meta),
      scanRange: getScanRange(this.meta),
      boostSpeed: getBoostSpeed(this.meta, this.run.player.overdriveTimer),
      fireRate: getFireRate(this.meta, this.run.player.overdriveTimer),
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

  private getUpgradeOffers(): UpgradeOffer[] {
    return UPGRADE_DEFS.map((definition) => {
      const level = this.meta.upgrades[definition.key];
      const cost = getUpgradeCost(level);
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

  purchaseUpgrade(key: UpgradeKey): boolean {
    if (!this.summary) {
      return false;
    }

    const level = this.meta.upgrades[key];
    const cost = getUpgradeCost(level);
    if (this.meta.credits < cost) {
      return false;
    }

    this.meta.credits -= cost;
    this.meta.upgrades[key] += 1;
    this.emit();
    return true;
  }

  startNextRun(): void {
    this.summary = null;
    this.meta.runNumber += 1;
    this.run = createRunState(this.meta);
    this.emit();
  }

  private spawnProjectile(run: RunState, direction: Vector2): void {
    const shotDirection = normalize(direction);
    const projectile: ProjectileState = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      x: run.player.x + shotDirection.x * 24,
      y: run.player.y + shotDirection.y * 24,
      vx: shotDirection.x * 520,
      vy: shotDirection.y * 520,
      ttl: 1.05,
      radius: 8,
      damage: getProjectileDamage(this.meta, run.player.overdriveTimer)
    };
    run.projectiles.push(projectile);
    run.player.fireCooldown = getFireCooldown(this.meta, run.player.overdriveTimer);
    run.player.heat = clamp(run.player.heat + 4.5, 0, 100);
    this.effects.push({ type: "shot", x: projectile.x, y: projectile.y, radius: 18 });
  }

  private maybeDropPickup(enemy: EnemyState): void {
    if (Math.random() > 0.55) {
      return;
    }

    const kind = randomPickupKind();
    const amount =
      kind === "repair"
        ? 18 + this.meta.upgrades.reactor * 4
        : kind === "coolant"
          ? 28 + this.meta.upgrades.reactor * 5
          : Math.round(getOverdriveDuration(this.meta));

    this.run.pickups.push(createPickup(Date.now() + Math.floor(Math.random() * 100000), kind, enemy.x, enemy.y, amount));
  }

  update(dt: number, input: FrameInput): void {
    if (this.summary) {
      return;
    }

    const run = this.run;
    const player = run.player;

    run.elapsed += dt;
    run.timeLeft = Math.max(0, run.timeLeft - dt);
    run.stormIntensity = 1 - run.timeLeft / 135;
    run.wave = 1 + Math.floor(run.elapsed / 35);

    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.scanCooldown = Math.max(0, player.scanCooldown - dt);
    player.empCooldown = Math.max(0, player.empCooldown - dt);
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.overdriveTimer = Math.max(0, player.overdriveTimer - dt);
    player.heat = clamp(player.heat - getHeatDecay(this.meta) * dt, 0, 100);

    if (run.messageTimer > 0) {
      run.messageTimer = Math.max(0, run.messageTimer - dt);
      if (run.messageTimer === 0) {
        run.message = "Dock with the courier ship to bank cargo. Fire with J or left click, scan with Space, pulse with F.";
      }
    }

    const moveVector = normalize({ x: input.moveX, y: input.moveY });
    const aimInput = normalize({ x: input.aimX, y: input.aimY });
    const harvestingNode =
      player.harvestingNodeId === null
        ? null
        : run.nodes.find((node) => node.id === player.harvestingNodeId) ?? null;

    const harvestingSlow = harvestingNode ? 0.35 : 1;
    const canBoost = input.boostHeld && player.heat < 96;
    const boostSpeed = canBoost ? getBoostSpeed(this.meta, player.overdriveTimer) : getBaseSpeed(this.meta, player.overdriveTimer);
    const desiredVelocity = {
      x: moveVector.x * boostSpeed * harvestingSlow,
      y: moveVector.y * boostSpeed * harvestingSlow
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

    if (canBoost && (moveVector.x !== 0 || moveVector.y !== 0)) {
      player.heat = clamp(player.heat + (16 - this.meta.upgrades.thrusters * 0.9) * dt, 0, 100);
    }

    player.x = clamp(player.x + player.vx * dt, 42, run.width - 42);
    player.y = clamp(player.y + player.vy * dt, 42, run.height - 42);

    if (input.shootHeld && player.fireCooldown <= 0 && player.heat < 98) {
      const shotDirection =
        aimInput.x !== 0 || aimInput.y !== 0
          ? aimInput
          : moveVector.x !== 0 || moveVector.y !== 0
            ? moveVector
            : normalize({ x: player.facingX, y: player.facingY });
      this.spawnProjectile(run, shotDirection);
    }

    if (input.scanPressed && player.scanCooldown <= 0) {
      const scanRange = getScanRange(this.meta);
      let revealed = 0;
      for (const node of run.nodes) {
        if (!node.scanned && !node.harvested && distance(player, node) <= scanRange) {
          node.scanned = true;
          revealed += 1;
        }
      }
      player.scanCooldown = getScanCooldown(this.meta);
      player.heat = clamp(player.heat + 8, 0, 100);
      setMessage(
        run,
        revealed > 0 ? `Scan resolved ${revealed} salvage pings.` : "Scan ping clear. No fresh signatures nearby.",
        2.8
      );
      this.effects.push({ type: "scan", x: player.x, y: player.y, radius: scanRange });
    }

    if (input.empPressed && player.empCooldown <= 0) {
      const empRadius = 150;
      let stunned = 0;
      for (const enemy of run.enemies) {
        const range = distance(player, enemy);
        if (range <= empRadius) {
          const impulse = normalize({ x: enemy.x - player.x, y: enemy.y - player.y });
          enemy.stunTimer = 2.3;
          enemy.vx += impulse.x * 180;
          enemy.vy += impulse.y * 180;
          stunned += 1;
        }
      }
      player.empCooldown = getEmpCooldown();
      player.heat = clamp(player.heat + 12, 0, 100);
      setMessage(run, stunned > 0 ? `EMP pulse staggered ${stunned} hostiles.` : "EMP pulse spent into empty storm.", 2.4);
      this.effects.push({ type: "emp", x: player.x, y: player.y, radius: empRadius });
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
        if (player.cargo + nearestNode.cargo > getCargoCapacity(this.meta)) {
          setMessage(run, "Cargo hold too tight for that haul. Dock and bank your load or upgrade the hold.", 3.1);
        } else {
          player.harvestingNodeId = nearestNode.id;
          player.harvestTimer = nearestNode.harvestDuration;
          player.harvestDurationTotal = nearestNode.harvestDuration;
          setMessage(run, `Harvesting ${nearestNode.rarity} cache. Hold position until the link meter fills.`, 2.2);
        }
      } else if (atGate && player.cargoValue <= 0) {
        setMessage(run, "That shuttle is ready to dock, but you need cargo aboard first.", 2.8);
      } else {
        setMessage(run, "Nothing to harvest here. Move onto a revealed cache or dock with the courier ship, then press E.", 2.3);
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
          player.cargoValue += activeHarvest.value;
          player.heat = clamp(player.heat + activeHarvest.heat, 0, 100);
          setMessage(
            run,
            `${activeHarvest.rarity.toUpperCase()} haul secured. Cargo ${player.cargo}/${getCargoCapacity(this.meta)}. Dock with the shuttle when ready.`,
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
      } else if (pickup.kind === "coolant") {
        player.heat = clamp(player.heat - pickup.amount, 0, 100);
        setMessage(run, `Coolant flush vented ${pickup.amount}% heat.`, 2);
      } else {
        player.overdriveTimer = Math.max(player.overdriveTimer, pickup.amount);
        setMessage(run, `Overdrive online for ${pickup.amount}s. Engines and blaster boosted.`, 2.3);
      }

      this.effects.push({ type: "pickup", x: pickup.x, y: pickup.y, radius: 44 });
      run.pickups = run.pickups.filter((entry) => entry.id !== pickup.id);
    }

    run.spawnTimer -= dt;
    const maxEnemies = 4 + run.wave + Math.floor(player.heat / 28);
    if (run.spawnTimer <= 0 && run.enemies.length < maxEnemies) {
      run.enemies.push(spawnEnemy(run));
      run.spawnTimer = clamp(3.6 - run.stormIntensity * 1.5 - player.heat * 0.012 + Math.random(), 0.85, 4.1);
    }

    const survivingEnemies: EnemyState[] = [];
    for (const enemy of run.enemies) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      if (enemy.stunTimer > 0) {
        enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
        enemy.vx *= Math.max(0, 1 - dt * 3.2);
        enemy.vy *= Math.max(0, 1 - dt * 3.2);
      } else {
        const toPlayer = normalize({ x: player.x - enemy.x, y: player.y - enemy.y });
        const speed = enemy.kind === "hunter" ? 164 : 122;
        const aggression = 1 + player.heat / 120;
        enemy.vx = lerp(enemy.vx, toPlayer.x * speed * aggression, Math.min(1, dt * 2.8));
        enemy.vy = lerp(enemy.vy, toPlayer.y * speed * aggression, Math.min(1, dt * 2.8));
      }

      enemy.x = clamp(enemy.x + enemy.vx * dt, 16, run.width - 16);
      enemy.y = clamp(enemy.y + enemy.vy * dt, 16, run.height - 16);

      if (distance(enemy, player) <= 34 && enemy.attackCooldown <= 0 && player.invulnTimer <= 0) {
        const damage = enemy.kind === "hunter" ? 17 : 11;
        player.hull = Math.max(0, player.hull - damage);
        player.invulnTimer = 0.7;
        enemy.attackCooldown = 1.05;
        enemy.stunTimer = 0.35;
        const shove = normalize({ x: enemy.x - player.x, y: enemy.y - player.y });
        player.vx -= shove.x * 120;
        player.vy -= shove.y * 120;
        setMessage(run, `Hull breach: -${damage}. Fire back, pulse, or dock before the lane closes.`, 2.1);
        this.effects.push({ type: "damage", x: player.x, y: player.y, radius: 42 });
      }

      if (enemy.hp > 0) {
        survivingEnemies.push(enemy);
      }
    }
    run.enemies = survivingEnemies;

    const survivingProjectiles: ProjectileState[] = [];
    for (const projectile of run.projectiles) {
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

      let hitEnemy: EnemyState | null = null;
      for (const enemy of run.enemies) {
        if (distance(projectile, enemy) <= projectile.radius + (enemy.kind === "hunter" ? 18 : 14)) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        hitEnemy.hp -= projectile.damage;
        hitEnemy.stunTimer = Math.max(hitEnemy.stunTimer, 0.18);
        if (hitEnemy.hp <= 0) {
          this.maybeDropPickup(hitEnemy);
          setMessage(run, `${hitEnemy.kind === "hunter" ? "Hunter" : "Drone"} down. Scoop the drop if you can.`, 1.8);
        }
        this.effects.push({ type: "damage", x: projectile.x, y: projectile.y, radius: 22 });
        continue;
      }

      survivingProjectiles.push(projectile);
    }
    run.projectiles = survivingProjectiles;

    if (run.timeLeft <= 0) {
      run.outcome = "storm";
      this.summary = finalizeRun(this.meta, run, "storm");
      this.effects.push({ type: "storm", x: player.x, y: player.y, radius: 180 });
      this.emit();
      return;
    }

    if (player.hull <= 0) {
      run.outcome = "destroyed";
      this.summary = finalizeRun(this.meta, run, "destroyed");
      this.effects.push({ type: "destroyed", x: player.x, y: player.y, radius: 180 });
      this.emit();
      return;
    }

    this.emit();
  }
}
