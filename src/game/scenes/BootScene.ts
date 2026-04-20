import Phaser from "phaser";

function makeTriangle(scene: Phaser.Scene, key: string, width: number, height: number, color: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(color, 1);
  graphics.beginPath();
  graphics.moveTo(width * 0.5, 0);
  graphics.lineTo(width, height);
  graphics.lineTo(0, height);
  graphics.closePath();
  graphics.fillPath();
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function makeCircle(scene: Phaser.Scene, key: string, radius: number, color: number, lineColor?: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  if (lineColor !== undefined) {
    graphics.lineStyle(4, lineColor, 1);
  }
  graphics.fillStyle(color, 1);
  graphics.fillCircle(radius, radius, radius);
  if (lineColor !== undefined) {
    graphics.strokeCircle(radius, radius, radius - 2);
  }
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

function makeHex(scene: Phaser.Scene, key: string, radius: number, color: number, stroke: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(color, 1);
  graphics.lineStyle(3, stroke, 1);
  graphics.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Phaser.Math.DegToRad(60 * index - 30);
    const x = radius + Math.cos(angle) * radius;
    const y = radius + Math.sin(angle) * radius;
    if (index === 0) {
      graphics.moveTo(x, y);
    } else {
      graphics.lineTo(x, y);
    }
  }
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

function makeRing(scene: Phaser.Scene, key: string, radius: number, color: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.lineStyle(6, color, 1);
  graphics.strokeCircle(radius, radius, radius - 4);
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

function makeDockShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x17364a, 1);
  graphics.lineStyle(4, 0x9de7ff, 0.9);
  graphics.fillRoundedRect(18, 22, 104, 42, 18);
  graphics.strokeRoundedRect(18, 22, 104, 42, 18);
  graphics.fillStyle(0x75f0db, 0.9);
  graphics.fillTriangle(70, 0, 140, 44, 70, 88);
  graphics.fillStyle(0x0b1b29, 1);
  graphics.fillRect(38, 34, 48, 16);
  graphics.fillStyle(0xffd56b, 0.85);
  graphics.fillRect(90, 34, 18, 16);
  graphics.generateTexture(key, 148, 88);
  graphics.destroy();
}

function makeDiamond(scene: Phaser.Scene, key: string, radius: number, color: number, lineColor: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(color, 1);
  graphics.lineStyle(3, lineColor, 1);
  graphics.beginPath();
  graphics.moveTo(radius, 0);
  graphics.lineTo(radius * 2, radius);
  graphics.lineTo(radius, radius * 2);
  graphics.lineTo(0, radius);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

function makeBolt(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x7ef8ff, 1);
  graphics.lineStyle(2, 0xffffff, 0.9);
  graphics.fillRoundedRect(2, 6, 22, 8, 4);
  graphics.strokeRoundedRect(2, 6, 22, 8, 4);
  graphics.generateTexture(key, 26, 20);
  graphics.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    makeTriangle(this, "ship", 36, 44, 0x8ff5d3);
    makeCircle(this, "node-common", 16, 0xb6d56c, 0xf4ffbc);
    makeCircle(this, "node-rare", 18, 0x39c6ff, 0xb9f0ff);
    makeCircle(this, "node-artifact", 20, 0xffcc57, 0xfff0ad);
    makeCircle(this, "node-hidden", 15, 0x213244, 0x4e718f);
    makeHex(this, "drone", 16, 0xff6a88, 0xffcfda);
    makeHex(this, "hunter", 20, 0xff8f3f, 0xffe0ba);
    makeRing(this, "gate", 58, 0x6ff7ff);
    makeDockShip(this, "dock-ship");
    makeDiamond(this, "pickup-repair", 12, 0x67d3a5, 0xcfffe8);
    makeDiamond(this, "pickup-coolant", 12, 0x5db3ff, 0xd3eeff);
    makeDiamond(this, "pickup-overdrive", 12, 0xffb35a, 0xffebc6);
    makeBolt(this, "bolt");
    makeCircle(this, "spark", 4, 0xffffff);
    this.scene.start("game", { controller: this.registry.get("controller") });
  }
}
