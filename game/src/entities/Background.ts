import Phaser from "phaser";
import { TILE_ASSETS_REGISTRY_KEY, TILE_KEYS } from "../config/AssetConfig";
import { COLORS } from "../config/GameConfig";

const TILE_SIZE = 64;
const TEXTURE_KEY = "grid-tile";

// Sparse, deterministic decor scatter (real-tileset mode only) — fixed
// spacing/offset rather than per-boot Math.random(), so placement stays
// identical between runs instead of visibly shifting on every reload.
const DECOR_SPACING = 420;
const DECOR_MARGIN = 160;
const DECOR_ALPHA = 0.85;

/**
 * The play area's floor. Two rendering paths, same dual-path pattern as
 * Player/Enemy/Weapon/Projectile (see AssetConfig.ts): a real tileset
 * image (`public/assets/tiles/floor.png`) tiled across the world plus a
 * sparse scatter of decor images, when that tileset actually loaded —
 * or, this project's current, actual zero-asset state, the existing
 * generated grid texture with its baked-in crack lines, no real image
 * required either way.
 */
export class Background extends Phaser.GameObjects.Container {
  private readonly floor: Phaser.GameObjects.TileSprite;
  private readonly decorImages: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);

    const hasTilesetAssets = (scene.registry.get(TILE_ASSETS_REGISTRY_KEY) as boolean | undefined) ?? false;
    const floorKey = hasTilesetAssets ? TILE_KEYS.floor : Background.ensureGeneratedTexture(scene);

    this.floor = scene.add.tileSprite(width / 2, height / 2, width, height, floorKey);
    this.add(this.floor);

    if (hasTilesetAssets) {
      this.scatterDecor(scene, width, height);
    }

    scene.add.existing(this);
  }

  /**
   * Mirrors ScreenFX.setNightLevel()'s progressive darkening/blood-tint
   * (`t` is 0 at Night 1, 1 at Night 7 — the same value MainScene passes
   * to ScreenFX, called alongside it from the same WAVE_INTRO handler),
   * but applied directly to this background's own game objects — a
   * multiply-tint on the floor TileSprite and every scattered decor
   * image — rather than as camera-level post-processing. That matters
   * for two reasons: it's the floor's actual rendered color shifting
   * with the nights, not just a screen-wide overlay sitting on top of
   * it, and it still works on a Canvas2D fallback renderer where
   * ScreenFX's WebGL-only ColorMatrix pipeline can't run at all (see
   * ScreenFX's own doc comment on isWebGLRenderer()).
   *
   * Not a literal reproduction of ScreenFX's ColorMatrix math (a plain
   * multiply-tint can't replicate a full saturation matrix) — same
   * visual direction instead: darken overall brightness by the same
   * 1-0.35t ScreenFX uses, then fade green/blue further so red ends up
   * relatively dominant, reading as the same "darker and blood-warmer"
   * progression.
   */
  setNightLevel(t: number): void {
    const clamped = Phaser.Math.Clamp(t, 0, 1);
    const darken = 1 - 0.35 * clamped;
    const r = darken * 255;
    const g = darken * 255 * (1 - 0.35 * clamped);
    const b = darken * 255 * (1 - 0.45 * clamped);
    const tint = Phaser.Display.Color.GetColor(r, g, b);

    this.floor.setTint(tint);
    for (const decor of this.decorImages) {
      decor.setTint(tint);
    }
  }

  /**
   * Alternates between the two decor images and staggers alternate rows
   * by half the grid spacing, so the scatter reads as irregular clutter
   * rather than a visibly repeating tile pattern. Real-tileset mode only
   * — the generated-texture path already bakes its own crack-line grime
   * directly into the floor texture (see ensureGeneratedTexture below).
   */
  private scatterDecor(scene: Phaser.Scene, width: number, height: number): void {
    const decorKeys = [TILE_KEYS.decorCrack, TILE_KEYS.decorRubble];
    let index = 0;

    for (let y = DECOR_MARGIN; y < height - DECOR_MARGIN; y += DECOR_SPACING) {
      const rowOffsetX = (Math.floor(y / DECOR_SPACING) % 2) * (DECOR_SPACING / 2);
      for (let x = DECOR_MARGIN; x < width - DECOR_MARGIN; x += DECOR_SPACING) {
        const key = decorKeys[index % decorKeys.length];
        const image = scene.add.image(x + rowOffsetX, y, key).setAlpha(DECOR_ALPHA);
        this.add(image);
        this.decorImages.push(image);
        index += 1;
      }
    }
  }

  /** Existing zero-asset vector-art floor, unchanged — returns the (possibly already-cached) texture key. */
  private static ensureGeneratedTexture(scene: Phaser.Scene): string {
    if (scene.textures.exists(TEXTURE_KEY)) {
      return TEXTURE_KEY;
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

    return TEXTURE_KEY;
  }
}
