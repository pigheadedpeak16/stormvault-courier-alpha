import Phaser from "phaser";

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

function makeSquare(scene: Phaser.Scene, key: string, size: number, color: number, stroke: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(color, 1);
  graphics.lineStyle(3, stroke, 1);
  graphics.fillRoundedRect(3, 3, size - 6, size - 6, 8);
  graphics.strokeRoundedRect(3, 3, size - 6, size - 6, 8);
  graphics.generateTexture(key, size, size);
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

function makeCourierShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x8ff5d3, 1);
  graphics.lineStyle(3, 0xe8fff7, 0.95);
  graphics.beginPath();
  graphics.moveTo(20, 2);
  graphics.lineTo(38, 34);
  graphics.lineTo(20, 28);
  graphics.lineTo(2, 34);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, 40, 38);
  graphics.destroy();
}

function makeTwinframeShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x8ff5d3, 1);
  graphics.lineStyle(3, 0xe8fff7, 0.95);
  graphics.fillRoundedRect(10, 12, 24, 20, 8);
  graphics.strokeRoundedRect(10, 12, 24, 20, 8);
  graphics.fillRect(11, 0, 6, 16);
  graphics.fillRect(27, 0, 6, 16);
  graphics.strokeRect(11, 0, 6, 16);
  graphics.strokeRect(27, 0, 6, 16);
  graphics.generateTexture(key, 44, 38);
  graphics.destroy();
}

function makeLongshotShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x8ff5d3, 1);
  graphics.lineStyle(3, 0xe8fff7, 0.95);
  graphics.fillRoundedRect(14, 14, 16, 22, 7);
  graphics.strokeRoundedRect(14, 14, 16, 22, 7);
  graphics.fillRect(18, 0, 8, 20);
  graphics.strokeRect(18, 0, 8, 20);
  graphics.fillStyle(0xffd56b, 0.9);
  graphics.fillRect(16, 2, 12, 6);
  graphics.generateTexture(key, 44, 40);
  graphics.destroy();
}

function makeDroneBayShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x8ff5d3, 1);
  graphics.lineStyle(3, 0xe8fff7, 0.95);
  graphics.fillRoundedRect(6, 10, 32, 24, 10);
  graphics.strokeRoundedRect(6, 10, 32, 24, 10);
  graphics.fillStyle(0x08212f, 1);
  graphics.fillRect(14, 6, 16, 16);
  graphics.fillStyle(0xffd56b, 0.9);
  graphics.fillRect(18, 2, 8, 8);
  graphics.generateTexture(key, 44, 40);
  graphics.destroy();
}

function makeBulwarkShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x8ff5d3, 1);
  graphics.lineStyle(3, 0xe8fff7, 0.95);
  graphics.beginPath();
  graphics.moveTo(22, 2);
  graphics.lineTo(40, 16);
  graphics.lineTo(36, 38);
  graphics.lineTo(8, 38);
  graphics.lineTo(4, 16);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.fillRect(18, 0, 8, 12);
  graphics.strokeRect(18, 0, 8, 12);
  graphics.generateTexture(key, 44, 40);
  graphics.destroy();
}

function makePlayerDrone(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffd56b, 1);
  graphics.lineStyle(3, 0xfff5cc, 0.95);
  graphics.beginPath();
  graphics.moveTo(16, 0);
  graphics.lineTo(30, 20);
  graphics.lineTo(16, 28);
  graphics.lineTo(2, 20);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, 32, 30);
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

function makeBolt(scene: Phaser.Scene, key: string, color = 0x7ef8ff, lineColor = 0xffffff): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(color, 1);
  graphics.lineStyle(2, lineColor, 0.9);
  graphics.fillRoundedRect(2, 6, 22, 8, 4);
  graphics.strokeRoundedRect(2, 6, 22, 8, 4);
  graphics.generateTexture(key, 26, 20);
  graphics.destroy();
}

function makeHeavyShell(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffd56b, 1);
  graphics.lineStyle(3, 0xfff4d1, 0.95);
  graphics.fillRoundedRect(2, 4, 28, 14, 6);
  graphics.strokeRoundedRect(2, 4, 28, 14, 6);
  graphics.fillStyle(0xfff6de, 0.9);
  graphics.fillCircle(24, 11, 3);
  graphics.generateTexture(key, 34, 22);
  graphics.destroy();
}

function makeMissile(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffd477, 1);
  graphics.lineStyle(2, 0xfff3c5, 1);
  graphics.fillTriangle(14, 0, 26, 26, 2, 26);
  graphics.fillRect(9, 18, 10, 10);
  graphics.strokeTriangle(14, 0, 26, 26, 2, 26);
  graphics.generateTexture(key, 28, 30);
  graphics.destroy();
}

function makeLaser(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xff7f91, 0.95);
  graphics.lineStyle(2, 0xfff1f5, 0.85);
  graphics.fillRoundedRect(2, 5, 40, 10, 5);
  graphics.strokeRoundedRect(2, 5, 40, 10, 5);
  graphics.generateTexture(key, 44, 20);
  graphics.destroy();
}

function makeCarrier(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x7e1026, 1);
  graphics.lineStyle(4, 0xffc9d3, 0.95);
  graphics.beginPath();
  graphics.moveTo(44, 4);
  graphics.lineTo(78, 26);
  graphics.lineTo(78, 62);
  graphics.lineTo(44, 84);
  graphics.lineTo(10, 62);
  graphics.lineTo(10, 26);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.fillStyle(0x350610, 1);
  graphics.fillRect(28, 26, 32, 36);
  graphics.fillStyle(0xffd06b, 0.92);
  graphics.fillRect(36, 34, 16, 20);
  graphics.generateTexture(key, 88, 88);
  graphics.destroy();
}

function makeMineLayer(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x4ad8a4, 1);
  graphics.lineStyle(3, 0xd2fff0, 0.95);
  graphics.fillRoundedRect(6, 10, 28, 20, 6);
  graphics.strokeRoundedRect(6, 10, 28, 20, 6);
  graphics.fillStyle(0x0b211a, 1);
  graphics.fillCircle(20, 20, 5);
  graphics.fillCircle(10, 20, 3);
  graphics.fillCircle(30, 20, 3);
  graphics.generateTexture(key, 40, 40);
  graphics.destroy();
}

function makeInterceptor(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x79e6ff, 1);
  graphics.lineStyle(3, 0xe7fbff, 0.95);
  graphics.beginPath();
  graphics.moveTo(18, 2);
  graphics.lineTo(34, 34);
  graphics.lineTo(18, 26);
  graphics.lineTo(2, 34);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, 36, 36);
  graphics.destroy();
}

function makeLeech(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x9eff5a, 1);
  graphics.lineStyle(3, 0xf0ffc5, 0.95);
  graphics.fillEllipse(18, 20, 28, 20);
  graphics.strokeEllipse(18, 20, 28, 20);
  graphics.lineBetween(18, 20, 18, 34);
  graphics.lineBetween(12, 22, 8, 32);
  graphics.lineBetween(24, 22, 28, 32);
  graphics.generateTexture(key, 36, 40);
  graphics.destroy();
}

function makeJammer(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffe65a, 1);
  graphics.lineStyle(3, 0xfff9cf, 0.95);
  graphics.fillCircle(20, 20, 10);
  graphics.strokeCircle(20, 20, 10);
  graphics.lineBetween(20, 2, 20, 38);
  graphics.lineBetween(2, 20, 38, 20);
  graphics.lineBetween(7, 7, 33, 33);
  graphics.lineBetween(33, 7, 7, 33);
  graphics.generateTexture(key, 40, 40);
  graphics.destroy();
}

function makeShieldFrigate(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.lineStyle(3, 0xbfe9ff, 0.95);
  graphics.strokeCircle(22, 22, 18);
  graphics.fillStyle(0x4a7dff, 1);
  graphics.fillRoundedRect(12, 14, 20, 16, 6);
  graphics.strokeRoundedRect(12, 14, 20, 16, 6);
  graphics.generateTexture(key, 44, 44);
  graphics.destroy();
}

function makeSplitter(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xff9f5a, 1);
  graphics.lineStyle(3, 0xffebcf, 0.95);
  graphics.fillTriangle(10, 20, 18, 6, 26, 20);
  graphics.fillTriangle(18, 20, 26, 34, 34, 20);
  graphics.strokeTriangle(10, 20, 18, 6, 26, 20);
  graphics.strokeTriangle(18, 20, 26, 34, 34, 20);
  graphics.generateTexture(key, 44, 40);
  graphics.destroy();
}

function makeHarpoonShip(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xff6f7f, 1);
  graphics.lineStyle(3, 0xffd4d9, 0.95);
  graphics.fillTriangle(20, 2, 36, 30, 20, 24);
  graphics.fillRect(8, 12, 14, 8);
  graphics.lineStyle(2, 0xfff0f2, 0.9);
  graphics.lineBetween(20, 20, 4, 20);
  graphics.strokeTriangle(20, 2, 36, 30, 20, 24);
  graphics.generateTexture(key, 40, 34);
  graphics.destroy();
}

function makeCloak(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xd07cff, 0.95);
  graphics.lineStyle(3, 0xf0dbff, 0.9);
  graphics.fillEllipse(20, 20, 20, 28);
  graphics.strokeEllipse(20, 20, 20, 28);
  graphics.fillStyle(0x06131f, 1);
  graphics.fillCircle(24, 16, 7);
  graphics.generateTexture(key, 40, 40);
  graphics.destroy();
}

function makeSwarm(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(12, 14, 5);
  graphics.fillCircle(24, 10, 4);
  graphics.fillCircle(30, 22, 4);
  graphics.fillCircle(18, 28, 5);
  graphics.fillStyle(0xff5f8e, 0.85);
  graphics.fillCircle(12, 14, 2);
  graphics.fillCircle(24, 10, 2);
  graphics.fillCircle(30, 22, 2);
  graphics.fillCircle(18, 28, 2);
  graphics.generateTexture(key, 40, 40);
  graphics.destroy();
}

function makeSiege(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xb66cff, 1);
  graphics.lineStyle(3, 0xf0d8ff, 0.95);
  graphics.fillRoundedRect(6, 12, 34, 22, 6);
  graphics.strokeRoundedRect(6, 12, 34, 22, 6);
  graphics.fillRect(18, 2, 10, 16);
  graphics.strokeRect(18, 2, 10, 16);
  graphics.generateTexture(key, 46, 40);
  graphics.destroy();
}

function makeMine(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x4ad8a4, 1);
  graphics.lineStyle(2, 0xe5fff5, 0.95);
  graphics.fillCircle(16, 16, 10);
  graphics.strokeCircle(16, 16, 10);
  graphics.lineBetween(16, 0, 16, 6);
  graphics.lineBetween(16, 26, 16, 32);
  graphics.lineBetween(0, 16, 6, 16);
  graphics.lineBetween(26, 16, 32, 16);
  graphics.generateTexture(key, 32, 32);
  graphics.destroy();
}

function makeArtilleryMarker(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.lineStyle(3, 0xd38dff, 0.95);
  graphics.strokeCircle(24, 24, 18);
  graphics.lineBetween(24, 4, 24, 44);
  graphics.lineBetween(4, 24, 44, 24);
  graphics.generateTexture(key, 48, 48);
  graphics.destroy();
}

function makeDebris(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x6b7f93, 1);
  graphics.lineStyle(3, 0xd8e8f8, 0.4);
  graphics.beginPath();
  graphics.moveTo(18, 2);
  graphics.lineTo(36, 10);
  graphics.lineTo(42, 24);
  graphics.lineTo(32, 40);
  graphics.lineTo(12, 42);
  graphics.lineTo(2, 28);
  graphics.lineTo(6, 10);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, 44, 44);
  graphics.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    makeCourierShip(this, "ship-courier");
    makeTwinframeShip(this, "ship-twinframe");
    makeLongshotShip(this, "ship-longshot");
    makeDroneBayShip(this, "ship-dronebay");
    makeBulwarkShip(this, "ship-bulwark");
    makePlayerDrone(this, "player-drone");
    makeCircle(this, "node-common", 16, 0xb6d56c, 0xf4ffbc);
    makeCircle(this, "node-rare", 18, 0x39c6ff, 0xb9f0ff);
    makeCircle(this, "node-artifact", 20, 0xffcc57, 0xfff0ad);
    makeCircle(this, "node-hidden", 15, 0x213244, 0x4e718f);
    makeHex(this, "drone", 16, 0xff4fa0, 0xffd4ec);
    makeHex(this, "hunter", 20, 0xff8f3f, 0xffe0ba);
    makeSquare(this, "shooter", 34, 0x8b59ff, 0xe3d7ff);
    makeDiamond(this, "missileer", 18, 0xffb35a, 0xfff0c9);
    makeCarrier(this, "carrier");
    makeMineLayer(this, "minelayer");
    makeInterceptor(this, "interceptor");
    makeLeech(this, "leech");
    makeJammer(this, "jammer");
    makeShieldFrigate(this, "shieldfrigate");
    makeSplitter(this, "splitter");
    makeHarpoonShip(this, "harpoon");
    makeCloak(this, "cloak");
    makeSwarm(this, "swarm");
    makeSiege(this, "siege");
    makeRing(this, "gate", 58, 0x6ff7ff);
    makeDockShip(this, "dock-ship");
    makeDiamond(this, "pickup-repair", 12, 0x67d3a5, 0xcfffe8);
    makeBolt(this, "bolt", 0x7ef8ff, 0xffffff);
    makeHeavyShell(this, "shell-heavy");
    makeBolt(this, "enemy-bolt", 0xb57cff, 0xf2d8ff);
    makeMissile(this, "missile");
    makeMine(this, "mine");
    makeArtilleryMarker(this, "artillery");
    makeLaser(this, "laser");
    makeDebris(this, "debris-rock");
    makeCircle(this, "spark", 4, 0xffffff);
    this.scene.start("game", { controller: this.registry.get("controller") });
  }
}
