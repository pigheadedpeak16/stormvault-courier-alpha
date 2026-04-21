import Phaser from "phaser";
import { GameController } from "../core/GameController";
import type {
  DebrisState,
  EffectEvent,
  EnemyState,
  FrameInput,
  HudSnapshot,
  PickupState,
  ProjectileState,
  SalvageNodeState
} from "../core/types";

type EntityMap<T> = Map<number, T>;

interface SceneInitData {
  controller: GameController;
}

interface TouchActions {
  shootHeld: boolean;
  interactPressed: boolean;
  scanPressed: boolean;
}

export class GameScene extends Phaser.Scene {
  private controller!: GameController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerSprite!: Phaser.GameObjects.Image;
  private playerDroneSprite!: Phaser.GameObjects.Image;
  private dockShipSprite!: Phaser.GameObjects.Image;
  private dockGlow!: Phaser.GameObjects.Image;
  private background!: Phaser.GameObjects.TileSprite;
  private screenFlash!: Phaser.GameObjects.Rectangle;
  private nodeSprites: EntityMap<Phaser.GameObjects.Container> = new Map();
  private enemySprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private pickupSprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private projectileSprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private debrisSprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private touchPointerId: number | null = null;
  private pointerVector = new Phaser.Math.Vector2(0, -1);
  private touchActions: TouchActions = {
    shootHeld: false,
    interactPressed: false,
    scanPressed: false
  };

  constructor() {
    super("game");
  }

  init(data: SceneInitData): void {
    this.controller = data.controller ?? this.registry.get("controller");
  }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,E,X,J") as Record<string, Phaser.Input.Keyboard.Key>;

    const snapshot = this.controller.getSnapshot();

    this.cameras.main.setBounds(0, 0, snapshot.run.width, snapshot.run.height);
    this.cameras.main.setBackgroundColor(snapshot.systemTheme.bgBottom);
    this.cameras.main.setZoom(1.08);

    const texture = this.add.graphics();
    texture.fillGradientStyle(0x07121f, 0x07121f, 0x0d2231, 0x07121f, 1);
    texture.fillRect(0, 0, 512, 512);
    texture.lineStyle(1, 0x163446, 0.32);
    for (let x = 0; x < 512; x += 32) {
      texture.lineBetween(x, 0, x, 512);
    }
    for (let y = 0; y < 512; y += 32) {
      texture.lineBetween(0, y, 512, y);
    }
    for (let index = 0; index < 90; index += 1) {
      texture.fillStyle(index % 5 === 0 ? 0x7bbfd8 : 0xffffff, Phaser.Math.FloatBetween(0.1, 0.35));
      texture.fillCircle(Phaser.Math.Between(0, 512), Phaser.Math.Between(0, 512), Phaser.Math.Between(1, 2));
    }
    texture.generateTexture("background-grid", 512, 512);
    texture.destroy();

    this.background = this.add
      .tileSprite(0, 0, snapshot.run.width, snapshot.run.height, "background-grid")
      .setOrigin(0, 0)
      .setScrollFactor(0.92);
    this.background.setTint(snapshot.systemTheme.canvasTint);

    this.dockGlow = this.add.image(snapshot.run.extraction.x, snapshot.run.extraction.y + 8, "gate");
    this.dockGlow.setScale(0.82, 0.42);
    this.dockGlow.setAlpha(0.38);
    this.dockGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.dockGlow.setTint(snapshot.systemTheme.canvasTint);

    this.dockShipSprite = this.add.image(snapshot.run.extraction.x, snapshot.run.extraction.y - 26, "dock-ship");
    this.dockShipSprite.setScale(0.9);

    this.playerSprite = this.add.image(snapshot.run.player.x, snapshot.run.player.y, this.playerTexture(snapshot));
    this.playerSprite.setOrigin(0.5, 0.66);
    this.playerSprite.setScale(1.05);
    this.playerSprite.setTint(0xa7ffdf);
    this.playerDroneSprite = this.add.image(snapshot.run.player.x, snapshot.run.player.y, "player-drone");
    this.playerDroneSprite.setVisible(false);
    this.playerDroneSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.startFollow(this.playerSprite, true, 0.08, 0.08);

    this.screenFlash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff4b4b, 0);
    this.screenFlash.setOrigin(0, 0);
    this.screenFlash.setScrollFactor(0);
    this.screenFlash.setDepth(1000);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.updatePointerVector(pointer);
      if (this.isTouchPointer(pointer)) {
        this.touchPointerId = pointer.id;
      }
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.updatePointerVector(pointer);
      if (this.touchPointerId === pointer.id) {
        this.updatePointerVector(pointer);
      }
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.touchPointerId === pointer.id) {
        this.touchPointerId = null;
      }
    });

    window.addEventListener("stormvault-action", this.handleTouchAction as EventListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("stormvault-action", this.handleTouchAction as EventListener);
    });
  }

  private handleTouchAction = (event: Event): void => {
    const detail = (event as CustomEvent<{ action: keyof TouchActions; held?: boolean }>).detail;
    if (!detail) {
      return;
    }
    if (detail.action === "shootHeld") {
      this.touchActions[detail.action] = Boolean(detail.held);
      return;
    }
    this.touchActions[detail.action] = true;
  };

  private isTouchPointer(pointer: Phaser.Input.Pointer): boolean {
    const candidate = pointer as Phaser.Input.Pointer & { pointerType?: string; wasTouch?: boolean };
    return candidate.pointerType === "touch" || candidate.wasTouch === true;
  }

  private updatePointerVector(pointer: Phaser.Input.Pointer): void {
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const snapshot = this.controller.getSnapshot();
    this.pointerVector.set(worldPoint.x - snapshot.run.player.x, worldPoint.y - snapshot.run.player.y);
    if (this.pointerVector.lengthSq() > 0.0001) {
      this.pointerVector.normalize();
    }
  }

  private buildInput(): FrameInput {
    const keyboardMove = new Phaser.Math.Vector2(
      (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0) - (this.cursors.left.isDown || this.keys.A.isDown ? 1 : 0),
      (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0) - (this.cursors.up.isDown || this.keys.W.isDown ? 1 : 0)
    );

    if (keyboardMove.lengthSq() > 0) {
      keyboardMove.normalize();
    }

    const moveX = keyboardMove.lengthSq() > 0 ? keyboardMove.x : this.touchPointerId !== null ? this.pointerVector.x : 0;
    const moveY = keyboardMove.lengthSq() > 0 ? keyboardMove.y : this.touchPointerId !== null ? this.pointerVector.y : 0;

    const input: FrameInput = {
      moveX,
      moveY,
      aimX: this.pointerVector.x,
      aimY: this.pointerVector.y,
      shootHeld: this.input.activePointer.leftButtonDown() || this.keys.J.isDown || this.touchActions.shootHeld,
      interactPressed:
        Phaser.Input.Keyboard.JustDown(this.keys.E) ||
        Phaser.Input.Keyboard.JustDown(this.keys.X) ||
        this.touchActions.interactPressed,
      scanPressed: Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touchActions.scanPressed
    };

    this.touchActions.interactPressed = false;
    this.touchActions.scanPressed = false;
    return input;
  }

  update(_: number, delta: number): void {
    const dt = Math.min(0.033, delta / 1000);
    this.controller.update(dt, this.buildInput());
    const snapshot = this.controller.getSnapshot();
    const run = snapshot.run;

    this.syncNodes(snapshot);
    this.syncEnemies();
    this.syncPickups(run.pickups);
    this.syncProjectiles(run.projectiles);
    this.syncDebris(run.debris);

    this.playerSprite.setTexture(this.playerTexture(snapshot));
    this.playerSprite.setPosition(run.player.x, run.player.y);
    this.playerSprite.rotation = Math.atan2(run.player.facingY, run.player.facingX) + Math.PI / 2;
    this.playerSprite.setAlpha(run.player.invulnTimer > 0 ? 0.55 : 1);
    this.playerSprite.setScale(this.playerScale(snapshot));
    this.cameras.main.setZoom(this.cameraZoom(snapshot));

    if (run.playerDrone?.active) {
      this.playerDroneSprite.setVisible(true);
      this.playerDroneSprite.setPosition(run.playerDrone.x, run.playerDrone.y);
      this.playerDroneSprite.rotation = Math.atan2(run.playerDrone.vy, run.playerDrone.vx) + Math.PI / 2;
      this.playerDroneSprite.setAlpha(0.9 * Math.max(0.35, run.playerDrone.hp / run.playerDrone.maxHp));
      this.playerDroneSprite.setScale(0.84 + Math.sin(this.time.now / 120) * 0.04);
    } else {
      this.playerDroneSprite.setVisible(false);
    }

    this.dockShipSprite.setScale(0.9 + Math.sin(this.time.now / 460) * 0.02);
    this.dockGlow.setScale(0.82 + Math.sin(this.time.now / 280) * 0.04, 0.42 + Math.sin(this.time.now / 280) * 0.02);
    this.dockShipSprite.setAlpha(run.timeLeft <= 0 ? 0.92 : 1);
    this.dockGlow.setAlpha(run.timeLeft <= 0 ? 0.52 : 0.38);
    this.dockShipSprite.setTint(run.timeLeft <= 0 ? 0xfff0c0 : 0xffffff);
    this.background.setTint(snapshot.systemTheme.canvasTint);
    this.dockGlow.setTint(snapshot.systemTheme.canvasTint);
    this.cameras.main.setBackgroundColor(snapshot.systemTheme.bgBottom);
    this.background.tilePositionX = this.cameras.main.scrollX * 0.12;
    this.background.tilePositionY = this.cameras.main.scrollY * 0.12;
    this.screenFlash.setSize(this.scale.width, this.scale.height);

    for (const effect of this.controller.consumeEffects()) {
      this.playEffect(effect);
    }
  }

  private syncNodes(snapshot: HudSnapshot): void {
    const nodes = snapshot.run.nodes;
    const existingIds = new Set(nodes.map((node) => node.id));
    for (const [id, sprite] of this.nodeSprites.entries()) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.nodeSprites.delete(id);
      }
    }

    for (const node of nodes) {
      if (node.harvested) {
        const found = this.nodeSprites.get(node.id);
        if (found) {
          this.nodeSprites.delete(node.id);
          this.tweens.add({
            targets: found,
            alpha: 0,
            scale: 0.5,
            duration: 180,
            onComplete: () => {
              found.destroy();
            }
          });
        }
        continue;
      }

      let container = this.nodeSprites.get(node.id);
      if (!container) {
        const sprite = this.add.image(0, 0, node.scanned ? this.nodeTexture(node) : "node-hidden");
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        const label = this.add
          .text(0, 26, "?", {
            fontFamily: "Trebuchet MS, Verdana, sans-serif",
            fontSize: "12px",
            color: "#dff7ff"
          })
          .setOrigin(0.5, 0);
        container = this.add.container(node.x, node.y, [sprite, label]);
        this.nodeSprites.set(node.id, container);
      }

      const [sprite, label] = container.list as [Phaser.GameObjects.Image, Phaser.GameObjects.Text];
      sprite.setTexture(node.scanned ? this.nodeTexture(node) : "node-hidden");
      const displayedValue = Math.round(node.value * (1 + snapshot.meta.permanentUpgrades.orbAppraisal * 0.14));
      label.setText(node.scanned ? `${displayedValue}c` : "?");
      label.setAlpha(node.scanned ? 1 : 0.45);
      container.setPosition(node.x, node.y);
      container.setScale(node.scanned ? 1 + Math.sin((this.time.now + node.id * 100) / 340) * 0.04 : 0.92);
      container.setAlpha(node.scanned ? 1 : 0.68);
    }
  }

  private syncPickups(pickups: PickupState[]): void {
    const existingIds = new Set(pickups.map((pickup) => pickup.id));
    for (const [id, sprite] of this.pickupSprites.entries()) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.pickupSprites.delete(id);
      }
    }

    for (const pickup of pickups) {
      let sprite = this.pickupSprites.get(pickup.id);
      if (!sprite) {
        sprite = this.add.image(pickup.x, pickup.y, pickup.kind === "system" ? "node-rare" : "pickup-repair");
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.pickupSprites.set(pickup.id, sprite);
      }

      sprite.setTexture(pickup.kind === "system" ? "node-rare" : "pickup-repair");
      sprite.setTint(
        pickup.kind === "system"
          ? pickup.amount >= 2
            ? 0xfff0a6
            : 0xffd56b
          : 0xffffff
      );
      sprite.setPosition(pickup.x, pickup.y + Math.sin((this.time.now + pickup.id) / 240) * 4);
      sprite.setScale(
        (pickup.kind === "system" ? 0.58 + pickup.amount * 0.08 : 0.92) + Math.sin((this.time.now + pickup.id) / 200) * 0.06
      );
    }
  }

  private syncProjectiles(projectiles: ProjectileState[]): void {
    const existingIds = new Set(projectiles.map((projectile) => projectile.id));
    for (const [id, sprite] of this.projectileSprites.entries()) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    for (const projectile of projectiles) {
      let sprite = this.projectileSprites.get(projectile.id);
      if (!sprite) {
        sprite = this.add.image(projectile.x, projectile.y, this.projectileTexture(projectile));
        sprite.setBlendMode(projectile.owner === "player" ? Phaser.BlendModes.ADD : Phaser.BlendModes.SCREEN);
        this.projectileSprites.set(projectile.id, sprite);
      }

      sprite.setTexture(this.projectileTexture(projectile));
      sprite.setPosition(projectile.x, projectile.y);
      sprite.rotation = Math.atan2(projectile.vy, projectile.vx);
      sprite.setScale(
        projectile.kind === "artillery"
          ? 1.2 + Math.sin(this.time.now / 80) * 0.08
          : projectile.kind === "mine"
            ? 0.96
            : projectile.kind === "laser"
              ? 1.08
              : projectile.kind === "missile"
                ? 0.92
                : 0.88
      );
      sprite.setAlpha(projectile.owner === "player" ? 1 : projectile.kind === "artillery" ? 0.8 : projectile.kind === "laser" ? 0.94 : 0.88);
    }
  }

  private syncDebris(debrisFields: DebrisState[]): void {
    const existingIds = new Set(debrisFields.map((debris) => debris.id));
    for (const [id, sprite] of this.debrisSprites.entries()) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.debrisSprites.delete(id);
      }
    }

    for (const debris of debrisFields) {
      let sprite = this.debrisSprites.get(debris.id);
      if (!sprite) {
        sprite = this.add.image(debris.x, debris.y, "debris-rock");
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
        this.debrisSprites.set(debris.id, sprite);
      }

      sprite.setPosition(debris.x, debris.y);
      sprite.setRotation(debris.rotation);
      sprite.setScale(Math.max(0.55, debris.radius / 18));
      sprite.setAlpha(0.72 + Math.min(0.18, debris.damage * 0.01));
    }
  }

  private nodeTexture(node: SalvageNodeState): string {
    if (node.rarity === "artifact") {
      return "node-artifact";
    }
    if (node.rarity === "rare") {
      return "node-rare";
    }
    return "node-common";
  }

  private playerTexture(snapshot: HudSnapshot): string {
    const currentClass = snapshot.meta.systemBuild.currentClass;
    if (["Twinframe", "Splitfire", "Gatling", "Broadside", "Vulcan"].includes(currentClass)) {
      return "ship-twinframe";
    }
    if (["Longshot", "Railcaster", "Missile Rack", "Beam Lancer", "Siege Boat"].includes(currentClass)) {
      return "ship-longshot";
    }
    if (["Drone Bay", "Overseer", "Swarm Carrier", "Command Core", "Hive Carrier"].includes(currentClass)) {
      return "ship-dronebay";
    }
    if (["Bulwark", "Trapper", "Ramship", "Fortress", "Juggernaut"].includes(currentClass)) {
      return "ship-bulwark";
    }
    return "ship-courier";
  }

  private playerScale(snapshot: HudSnapshot): number {
    const currentClass = snapshot.meta.systemBuild.currentClass;
    if (["Bulwark", "Trapper", "Ramship", "Fortress", "Juggernaut"].includes(currentClass)) {
      return 1.18;
    }
    if (["Longshot", "Railcaster", "Missile Rack", "Beam Lancer", "Siege Boat"].includes(currentClass)) {
      return 1.02;
    }
    return 1.05;
  }

  private cameraZoom(snapshot: HudSnapshot): number {
    const currentClass = snapshot.meta.systemBuild.currentClass;
    if (["Longshot", "Railcaster", "Missile Rack", "Beam Lancer", "Siege Boat"].includes(currentClass)) {
      return 0.92;
    }
    return 1.08;
  }

  private projectileTexture(projectile: ProjectileState): string {
    if (projectile.owner === "player" && projectile.radius >= 12) {
      return "shell-heavy";
    }
    if (projectile.kind === "missile") {
      return "missile";
    }
    if (projectile.kind === "mine") {
      return "mine";
    }
    if (projectile.kind === "artillery") {
      return "artillery";
    }
    if (projectile.kind === "laser") {
      return "laser";
    }
    return projectile.owner === "player" ? "bolt" : "enemy-bolt";
  }

  private enemyTexture(enemy: EnemyState): string {
    switch (enemy.kind) {
      case "minelayer":
        return "minelayer";
      case "interceptor":
        return "interceptor";
      case "leech":
        return "leech";
      case "jammer":
        return "jammer";
      case "shieldfrigate":
        return "shieldfrigate";
      case "splitter":
        return "splitter";
      case "harpoon":
        return "harpoon";
      case "cloak":
        return "cloak";
      case "swarm":
        return "swarm";
      case "siege":
        return "siege";
      case "shooter":
        return "shooter";
      case "missileer":
        return "missileer";
      case "carrier":
        return "carrier";
      case "hunter":
        return "hunter";
      default:
        return "drone";
    }
  }

  private syncEnemies(): void {
    const enemies = this.controller.getSnapshot().run.enemies;
    const player = this.controller.getSnapshot().run.player;
    const existingIds = new Set(enemies.map((enemy) => enemy.id));

    for (const [id, sprite] of this.enemySprites.entries()) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }

    for (const enemy of enemies) {
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = this.add.image(enemy.x, enemy.y, this.enemyTexture(enemy));
        sprite.setBlendMode(Phaser.BlendModes.SCREEN);
        this.enemySprites.set(enemy.id, sprite);
      }

      sprite.setTexture(this.enemyTexture(enemy));
      sprite.setPosition(enemy.x, enemy.y);
      sprite.rotation = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
      const cloakAlpha = enemy.kind === "cloak" ? (Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) > 180 ? 0.22 : 0.9) : 1;
      sprite.setAlpha((enemy.stunTimer > 0 ? 0.45 : enemy.chargeTimer > 0 ? 1 : 0.92) * cloakAlpha);
      const chargePulse = enemy.chargeTimer > 0 ? 1 + Math.sin(this.time.now / 40) * 0.12 : 1;
      sprite.setScale(
        (
          enemy.kind === "carrier"
            ? 1.48
            : enemy.kind === "shieldfrigate" || enemy.kind === "siege"
              ? 1.12
              : enemy.kind === "hunter" || enemy.kind === "splitter"
                ? 1.05
                : enemy.kind === "missileer" || enemy.kind === "harpoon"
                  ? 1.02
                  : enemy.kind === "swarm"
                    ? 0.82
                    : 0.9
        ) * chargePulse
      );
      sprite.setTint(
        enemy.chargeTimer > 0
          ? 0xffd27d
          : enemy.kind === "carrier"
            ? 0xff8f96
            : enemy.kind === "minelayer"
              ? 0x74f5c0
            : enemy.kind === "interceptor"
              ? 0x8aefff
            : enemy.kind === "leech"
              ? 0xb8ff6a
            : enemy.kind === "jammer"
              ? 0xffec7e
            : enemy.kind === "shieldfrigate"
              ? 0x8fc3ff
            : enemy.kind === "splitter"
              ? 0xffbb72
            : enemy.kind === "harpoon"
              ? 0xff8b9a
            : enemy.kind === "cloak"
              ? 0xe2a8ff
            : enemy.kind === "swarm"
              ? 0xff6d93
            : enemy.kind === "siege"
              ? 0xd08fff
            : enemy.kind === "shooter"
              ? 0xb57cff
            : enemy.kind === "missileer"
              ? 0xffcf74
              : enemy.kind === "hunter"
                ? 0xffb86c
                : enemy.kind === "drone"
                  ? 0xff72ba
              : 0xffffff
      );
    }
  }

  private playEffect(effect: EffectEvent): void {
    if (effect.type === "laser-charge" && effect.x2 !== undefined && effect.y2 !== undefined) {
      const telegraph = this.add.graphics();
      telegraph.setBlendMode(Phaser.BlendModes.ADD);
      telegraph.lineStyle(3, 0xffa8a8, 0.28);
      telegraph.beginPath();
      telegraph.moveTo(effect.x, effect.y);
      telegraph.lineTo(effect.x2, effect.y2);
      telegraph.strokePath();

      const orb = this.add.circle(effect.x, effect.y, 14, 0xffc67d, 0.42).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: orb,
        scale: 2.3,
        alpha: 0.1,
        duration: effect.durationMs ?? 1200,
        ease: "Sine.easeIn"
      });
      this.tweens.add({
        targets: telegraph,
        alpha: 0.1,
        duration: effect.durationMs ?? 1200,
        yoyo: true,
        repeat: 3,
        ease: "Sine.easeInOut",
        onComplete: () => telegraph.destroy()
      });
      this.time.delayedCall(effect.durationMs ?? 1200, () => orb.destroy());
      return;
    }

    if (effect.type === "laser-fire" && effect.x2 !== undefined && effect.y2 !== undefined) {
      const beam = this.add.graphics();
      beam.setBlendMode(Phaser.BlendModes.ADD);
      beam.lineStyle(22, 0xff2d19, 0.28);
      beam.beginPath();
      beam.moveTo(effect.x, effect.y);
      beam.lineTo(effect.x2, effect.y2);
      beam.strokePath();
      beam.lineStyle(8, 0xfff4e4, 0.98);
      beam.beginPath();
      beam.moveTo(effect.x, effect.y);
      beam.lineTo(effect.x2, effect.y2);
      beam.strokePath();

      const sourceFlare = this.add.circle(effect.x, effect.y, 24, 0xffdd9b, 0.72).setBlendMode(Phaser.BlendModes.ADD);
      const impactFlare = this.add.circle(effect.x2, effect.y2, 18, 0xff8f7d, 0.45).setBlendMode(Phaser.BlendModes.ADD);
      this.screenFlash.setFillStyle(0xff4b4b, 0.34);
      this.screenFlash.setAlpha(1);
      this.cameras.main.flash(180, 255, 90, 90, true);
      this.cameras.main.shake(220, 0.012);

      this.tweens.add({
        targets: [beam, sourceFlare, impactFlare, this.screenFlash],
        alpha: 0,
        duration: effect.durationMs ?? 180,
        ease: "Quad.easeOut",
        onComplete: () => {
          beam.destroy();
          sourceFlare.destroy();
          impactFlare.destroy();
          this.screenFlash.setAlpha(0);
        }
      });
      return;
    }

    if (effect.type === "artillery-warning") {
      const marker = this.add.circle(effect.x, effect.y, effect.radius ?? 44, 0xffa6ff, 0.08);
      marker.setStrokeStyle(4, 0xe0a0ff, 0.8);
      marker.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: marker,
        scale: 1.18,
        alpha: 0.22,
        duration: effect.durationMs ?? 900,
        yoyo: true,
        repeat: 2,
        onComplete: () => marker.destroy()
      });
      return;
    }

    if (effect.type === "artillery-blast") {
      const blast = this.add.circle(effect.x, effect.y, 12, 0xd98fff, 0.24).setBlendMode(Phaser.BlendModes.ADD);
      blast.setStrokeStyle(5, 0xffefff, 0.92);
      this.tweens.add({
        targets: blast,
        radius: effect.radius ?? 56,
        alpha: 0,
        duration: effect.durationMs ?? 260,
        ease: "Quad.easeOut",
        onComplete: () => blast.destroy()
      });
      this.cameras.main.shake(140, 0.007);
      return;
    }

    if (effect.type === "harpoon" && effect.x2 !== undefined && effect.y2 !== undefined) {
      const tether = this.add.graphics();
      tether.setBlendMode(Phaser.BlendModes.ADD);
      tether.lineStyle(4, 0xffa0aa, 0.9);
      tether.beginPath();
      tether.moveTo(effect.x, effect.y);
      tether.lineTo(effect.x2, effect.y2);
      tether.strokePath();
      this.tweens.add({
        targets: tether,
        alpha: 0,
        duration: effect.durationMs ?? 220,
        onComplete: () => tether.destroy()
      });
      return;
    }

    const pulse = this.add.circle(effect.x, effect.y, 12, 0xffffff, 0.22);
    pulse.setStrokeStyle(3, 0xffffff, 0.8);
    pulse.setBlendMode(Phaser.BlendModes.ADD);

    let color = 0x6ff7ff;
    if (effect.type === "damage" || effect.type === "destroyed") {
      color = 0xff7791;
    } else if (effect.type === "harvest" || effect.type === "extract") {
      color = 0xffd469;
    } else if (effect.type === "shot") {
      color = 0x8bf8ff;
    } else if (effect.type === "pickup") {
      color = 0x8ff5d3;
    }

    pulse.setFillStyle(color, 0.12);
    pulse.setStrokeStyle(3, color, 0.8);

    this.tweens.add({
      targets: pulse,
      radius: effect.radius ?? 120,
      alpha: 0,
      duration: effect.type === "destroyed" || effect.type === "storm" ? 650 : 320,
      ease: "Quad.easeOut",
      onComplete: () => pulse.destroy()
    });

    if (effect.type === "damage" || effect.type === "destroyed") {
      this.cameras.main.shake(effect.type === "destroyed" ? 220 : 120, effect.type === "destroyed" ? 0.01 : 0.004);
    }
  }
}
