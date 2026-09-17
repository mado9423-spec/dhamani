import Phaser from "phaser";
import { defineAnimations } from "../config/AnimationConfig";
import { SPRITE_ASSETS_REGISTRY_KEY, SPRITE_SHEETS, TILE_ASSETS, TILE_ASSETS_REGISTRY_KEY } from "../config/AssetConfig";

/**
 * Entry scene. Attempts to load real sprite sheets and ground tileset
 * images (see config/AssetConfig.ts) but never depends on either
 * existing — this project has shipped as a zero-external-asset game
 * throughout, so `public/assets/` is currently empty. Phaser's loader
 * doesn't abort on a missing file; it keeps going regardless, so
 * preload() just queues every sheet/tile, and create() turns the
 * *actual* outcome into a `hasSpriteAssets`/`hasTilesetAssets` flag pair
 * on the registry for MainScene/Player/Enemy/Weapon/Background to branch
 * on — real-asset rendering when (and only when) every file in that
 * group is genuinely usable, the existing vector-shape/generated-texture
 * rendering otherwise.
 *
 * That outcome is checked via `this.textures.exists(key)` in create(),
 * not by listening for the loader's `loaderror` event — verified the
 * hard way: Vite's dev server answers a missing `public/assets/*.png`
 * request with its SPA-fallback `index.html` (a 200 OK of the wrong
 * content type) rather than a real 404. Phaser's own texture pipeline
 * still correctly rejects that as unusable once it fails to decode as
 * an image — `textures.exists()` reports it missing — but that specific
 * failure mode doesn't reliably surface through `loaderror`, so trusting
 * the event alone silently left `hasSpriteAssets` true against an empty
 * assets folder. Checking the resulting texture cache directly is
 * authoritative regardless of *why* a load didn't pan out (real 404,
 * dev-server fallback, a corrupt file, anything else).
 *
 * One side effect worth knowing about, not fixing: Phaser's own
 * `File.js` unconditionally `console.error`s "Failed to process file"
 * for each sheet that fails to decode as an image — there's no loader
 * option to silence it, and it's an accurate diagnostic (we did
 * genuinely attempt an optional asset that isn't there), so with
 * `public/assets/` empty (this project's actual current state), expect
 * one such line per entry in SPRITE_SHEETS on every boot. It doesn't
 * indicate a problem; `hasSpriteAssets` above is what actually governs
 * behavior, and is correct regardless.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const sheet of SPRITE_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const tile of TILE_ASSETS) {
      this.load.image(tile.key, tile.path);
    }
  }

  create(): void {
    const hasSpriteAssets = SPRITE_SHEETS.every((sheet) => this.textures.exists(sheet.key));
    this.registry.set(SPRITE_ASSETS_REGISTRY_KEY, hasSpriteAssets);

    const hasTilesetAssets = TILE_ASSETS.every((tile) => this.textures.exists(tile.key));
    this.registry.set(TILE_ASSETS_REGISTRY_KEY, hasTilesetAssets);

    defineAnimations(this);

    this.scene.start("MainScene");
  }
}
