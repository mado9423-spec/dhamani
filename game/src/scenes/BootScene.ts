import Phaser from "phaser";

/**
 * Entry scene. Currently just hands off to MainScene, but this is
 * where future asset preloading (spritesheets, audio, JSON configs)
 * will live before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("MainScene");
  }
}
