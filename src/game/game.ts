import Phaser from "phaser";
import { GameController } from "./core/GameController";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

export function createGame(parent: string, controller: GameController): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#06131f",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight
    },
    scene: [BootScene, GameScene],
    physics: {
      default: "arcade"
    },
    render: {
      antialias: true,
      pixelArt: false
    },
    callbacks: {
      postBoot: (game) => {
        game.registry.set("controller", controller);
      }
    }
  });
}
