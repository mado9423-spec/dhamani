import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

const TILE_SIZE = 64;
const TEXTURE_KEY = "grid-tile";

/**
 * Simple top-down ground: a generated grid texture tiled across the
 * play area. Built from Graphics primitives so no external art is
 * required for the prototype.
 */
export class Background extends Phaser.GameObjects.TileSprite {
  constructor(scene: Phaser.Scene, width: number, height: number) {
    Background.ensureTexture(scene);
    super(scene, width / 2, height / 2, width, height, TEXTURE_KEY);
    scene.add.existing(this);
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(1, COLORS.gridLine, 1);
    graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    // A couple of faint, deterministic crack lines per tile — cheap
    // (baked once into the generated texture, not drawn per frame) grime
    // for the "grim environment" the floor is meant to anchor.
    graphics.lineStyle(1, COLORS.gridLine, 0.6);
    graphics.beginPath();
    graphics.moveTo(8, 6);
    graphics.lineTo(22, 18);
    graphics.lineTo(16, 30);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(40, 44);
    graphics.lineTo(50, 34);
    graphics.lineTo(58, 40);
    graphics.strokePath();

    graphics.generateTexture(TEXTURE_KEY, TILE_SIZE, TILE_SIZE);
    graphics.destroy();
  }
}
