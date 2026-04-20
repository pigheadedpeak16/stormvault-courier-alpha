import Phaser from "phaser";
import { GameController } from "../core/GameController";
import type { EffectEvent, FrameInput, PickupState, ProjectileState, SalvageNodeState } from "../core/types";

type EntityMap<T> = Map<number, T>;

interface SceneInitData {
  controller: GameController;
}

interface TouchActions {
  boostHeld: boolean;
  shootHeld: boolean;
  interactPressed: boolean;
  scanPressed: boolean;
  empPressed: boolean;
}

export class GameScene extends Phaser.Scene {
  private controller!: GameController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerSprite!: Phaser.GameObjects.Image;
  private dockShipSprite!: Phaser.GameObjects.Image;
  private dockGlow!: Phaser.GameObjects.Image;
  private background!: Phaser.GameObjects.TileSprite;
  private nodeSprites: EntityMap<Phaser.GameObjects.Container> = new Map();
  private enemySprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private pickupSprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private projectileSprites: EntityMap<Phaser.GameObjects.Image> = new Map();
  private touchPointerId: number | null = null;
  private pointerVector = new Phaser.Math.Vector2(0, -1);
  private touchActions: TouchActions = {
    boostHeld: false,
    shootHeld: false,
    interactPressed: false,
    scanPressed: false,
    empPressed: false
  };

  constructor() {
    super("game");
  }

  init(data: SceneInitData): void {
    this.controller = data.controller ?? this.registry.get("controller");
  }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,SHIFT,E,F,X,J") as Record<string, Phaser.Input.Keyboard.Key>;

    const snapshot = this.controller.getSnapshot();

    this.cameras.main.setBounds(0, 0, snapshot.run.width, snapshot.run.height);
    this.cameras.main.setBackgroundColor("#06131f");
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

    this.dockGlow = this.add.image(snapshot.run.extraction.x, snapshot.run.extraction.y + 8, "gate");
    this.dockGlow.setScale(0.82, 0.42);
    this.dockGlow.setAlpha(0.38);
    this.dockGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.dockShipSprite = this.add.image(snapshot.run.extraction.x, snapshot.run.extraction.y - 26, "dock-ship");
    this.dockShipSprite.setScale(0.9);

    this.playerSprite = this.add.image(snapshot.run.player.x, snapshot.run.player.y, "ship");
    this.playerSprite.setOrigin(0.5, 0.66);
    this.playerSprite.setScale(1.05);
    this.playerSprite.setTint(0xa7ffdf);
    this.cameras.main.startFollow(this.playerSprite, true, 0.08, 0.08);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.touchPointerId = pointer.id;
      this.updatePointerVector(pointer);
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
    if (detail.action === "boostHeld" || detail.action === "shootHeld") {
      this.touchActions[detail.action] = Boolean(detail.held);
      return;
    }
    this.touchActions[detail.action] = true;
  };

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
      boostHeld: this.keys.SHIFT.isDown || this.touchActions.boostHeld,
      shootHeld: this.input.activePointer.leftButtonDown() || this.keys.J.isDown || this.touchActions.shootHeld,
      interactPressed:
        Phaser.Input.Keyboard.JustDown(this.keys.E) ||
        Phaser.Input.Keyboard.JustDown(this.keys.X) ||
        this.touchActions.interactPressed,
      scanPressed: Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touchActions.scanPressed,
      empPressed: Phaser.Input.Keyboard.JustDown(this.keys.F) || this.touchActions.empPressed
    };

    this.touchActions.interactPressed = false;
    this.touchActions.scanPressed = false;
    this.touchActions.empPressed = false;
    return input;
  }

  update(_: number, delta: number): void {
    const dt = Math.min(0.033, delta / 1000);
    this.controller.update(dt, this.buildInput());
    const snapshot = this.controller.getSnapshot();
    const run = snapshot.run;

    this.syncNodes(run.nodes);
    this.syncEnemies();
    this.syncPickups(run.pickups);
    this.syncProjectiles(run.projectiles);

    this.playerSprite.setPosition(run.player.x, run.player.y);
    this.playerSprite.rotation = Math.atan2(run.player.facingY, run.player.facingX) + Math.PI / 2;
    this.playerSprite.setAlpha(run.player.invulnTimer > 0 ? 0.55 : 1);
    this.playerSprite.setTint(run.player.overdriveTimer > 0 ? 0xffd785 : run.player.heat > 75 ? 0xffb088 : 0xa7ffdf);

    this.dockShipSprite.setScale(0.9 + Math.sin(this.time.now / 460) * 0.02);
    this.dockGlow.setScale(0.82 + Math.sin(this.time.now / 280) * 0.04, 0.42 + Math.sin(this.time.now / 280) * 0.02);
    this.background.tilePositionX = this.cameras.main.scrollX * 0.12;
    this.background.tilePositionY = this.cameras.main.scrollY * 0.12;

    for (const effect of this.controller.consumeEffects()) {
      this.playEffect(effect);
    }
  }

  private syncNodes(nodes: SalvageNodeState[]): void {
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
      label.setText(node.scanned ? `${node.value}c` : "?");
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
        sprite = this.add.image(pickup.x, pickup.y, this.pickupTexture(pickup.kind));
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.pickupSprites.set(pickup.id, sprite);
      }

      sprite.setPosition(pickup.x, pickup.y + Math.sin((this.time.now + pickup.id) / 240) * 4);
      sprite.setScale(0.92 + Math.sin((this.time.now + pickup.id) / 200) * 0.06);
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
        sprite = this.add.image(projectile.x, projectile.y, "bolt");
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.projectileSprites.set(projectile.id, sprite);
      }

      sprite.setPosition(projectile.x, projectile.y);
      sprite.rotation = Math.atan2(projectile.vy, projectile.vx);
    }
  }

  private pickupTexture(kind: PickupState["kind"]): string {
    if (kind === "repair") {
      return "pickup-repair";
    }
    if (kind === "coolant") {
      return "pickup-coolant";
    }
    return "pickup-overdrive";
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

  private syncEnemies(): void {
    const enemies = this.controller.getSnapshot().run.enemies;
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
        sprite = this.add.image(enemy.x, enemy.y, enemy.kind === "hunter" ? "hunter" : "drone");
        sprite.setBlendMode(Phaser.BlendModes.SCREEN);
        this.enemySprites.set(enemy.id, sprite);
      }

      sprite.setPosition(enemy.x, enemy.y);
      sprite.rotation = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
      sprite.setAlpha(enemy.stunTimer > 0 ? 0.45 : 0.92);
      sprite.setScale(enemy.kind === "hunter" ? 1.05 : 0.88);
    }
  }

  private playEffect(effect: EffectEvent): void {
    const pulse = this.add.circle(effect.x, effect.y, 12, 0xffffff, 0.22);
    pulse.setStrokeStyle(3, 0xffffff, 0.8);
    pulse.setBlendMode(Phaser.BlendModes.ADD);

    let color = 0x6ff7ff;
    if (effect.type === "emp") {
      color = 0x8ab8ff;
    } else if (effect.type === "damage" || effect.type === "destroyed") {
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
