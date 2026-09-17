import Phaser from "phaser";
import { defineAnimations } from "../config/AnimationConfig";
import { SPRITE_ASSETS_REGISTRY_KEY, SPRITE_SHEETS, TILE_ASSETS, TILE_ASSETS_REGISTRY_KEY } from "../config/AssetConfig";

/**
 * Entry scene. Loads real sprite sheets and ground tileset images (see
 * config/AssetConfig.ts's SPRITE_SHEETS/TILE_ASSETS — every path/frame
 * size there is real, sourced from the public-domain GothicVania Church/
 * Cemetery packs by Luis Zuno @ansimuz) but never *depends* on either
 * fully existing — the defensive dual-path design here predates the real
 * art (this project shipped as zero-external-asset for a long stretch)
 * and is kept exactly as-is: swap/add/remove a file in SPRITE_SHEETS or
 * TILE_ASSETS and this still degrades to the vector-shape/generated-
 * texture rendering automatically if that file is ever missing/corrupt,
 * rather than crashing or silently rendering nothing. Phaser's loader
 * doesn't abort on a missing file either way; it keeps going regardless,
 * so preload() just queues every sheet/tile, and create() turns the
 * *actual* outcome into a `hasSpriteAssets`/`hasTilesetAssets` flag pair
 * on the registry for MainScene/Player/Enemy/Weapon/Background to branch
 * on — real-asset rendering when (and only when) every file in that
 * group is genuinely usable.
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
 * "leaper"/"exploder" have real art staged in public/assets/ too
 * (leaper.png, exploder.png) but are deliberately *not* in SPRITE_SHEETS
 * yet — see AnimationConfig.ts's ENEMY_TYPES comment.
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
