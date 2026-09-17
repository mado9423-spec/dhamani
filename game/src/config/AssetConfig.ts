// Key used on Phaser's game-level registry (same pattern as
// QualityConfig's QUALITY_REGISTRY_KEY) to share whether real sprite
// assets loaded successfully. Set once in BootScene.create() — after
// its preload() has had a chance to fail every queued file — and read
// by MainScene/Player/Enemy/Weapon to pick sprite-based rendering over
// the existing zero-asset vector-shape rendering.
export const SPRITE_ASSETS_REGISTRY_KEY = "hasSpriteAssets";

export interface SpriteSheetDefinition {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
}

// Real art (GothicVania Church/Cemetery, public domain — see
// game/assets-staging exploration): each sheet is a horizontal strip of
// frames composited from the source packs' loose per-action PNGs, bottom-
// center aligned within a per-character cell size (see the compositing
// notes in PROGRESS.md-adjacent history — the source packs' own packed
// atlases are non-uniform texture-packer output, not a plain grid, so a
// fresh uniform strip was built instead of slicing those directly).
// frameWidth/frameHeight below are that per-character cell size, not a
// shared constant — every enemy sheet (walker/fast/ranged/tank/boss/
// finalBoss) packs exactly 16 frames in ENEMY_STATE_FRAMES's idle(4) +
// move(6) + hit(2) + death(4) order (see AnimationConfig.ts); player
// sheets are natural-length strips (createAnimFromWholeSheet uses every
// frame, no fixed count).
export const SPRITE_SHEETS: SpriteSheetDefinition[] = [
  { key: "player_idle", path: "assets/player_idle.png", frameWidth: 82, frameHeight: 60 }, // Monk, 4 frames
  { key: "player_run", path: "assets/player_run.png", frameWidth: 82, frameHeight: 60 }, // Monk, 6 frames
  { key: "player_attack", path: "assets/player_attack.png", frameWidth: 82, frameHeight: 60 }, // Monk, 6 frames
  { key: "walker", path: "assets/walker.png", frameWidth: 81, frameHeight: 66 }, // Burning Ghoul
  { key: "fast", path: "assets/fast.png", frameWidth: 122, frameHeight: 117 }, // Angel
  { key: "ranged", path: "assets/ranged.png", frameWidth: 81, frameHeight: 66 }, // Skeleton Wizard
  { key: "tank", path: "assets/tank.png", frameWidth: 44, frameHeight: 52 }, // Cemetery skeleton-clothed
  { key: "boss", path: "assets/boss.png", frameWidth: 122, frameHeight: 117 }, // Angel (reused, visually biggest)
  { key: "finalBoss", path: "assets/finalBoss.png", frameWidth: 122, frameHeight: 117 }, // Angel (reused)
  { key: "weapon_bolt", path: "assets/weapon_bolt.png", frameWidth: 26, frameHeight: 26 }, // church fireball FX
];

// Same registry-flag pattern as SPRITE_ASSETS_REGISTRY_KEY above, for the
// ground tileset (see entities/Background.ts): set once in
// BootScene.create() from the *actual* post-load texture-cache outcome
// (never a loaderror event — see BootScene's doc comment for why), read
// by Background to pick a real tile image over the existing generated
// grid texture. Plain static images, not spritesheets — a floor tile and
// a couple of scattered decor pieces, nothing animated.
export const TILE_ASSETS_REGISTRY_KEY = "hasTilesetAssets";

export interface TileAssetDefinition {
  key: string;
  path: string;
}

export const TILE_KEYS = {
  floor: "tile-floor",
  decorCrack: "tile-decor-crack",
  decorRubble: "tile-decor-rubble",
} as const;

export const TILE_ASSETS: TileAssetDefinition[] = [
  { key: TILE_KEYS.floor, path: "assets/tiles/floor.png" },
  { key: TILE_KEYS.decorCrack, path: "assets/tiles/decor-crack.png" },
  { key: TILE_KEYS.decorRubble, path: "assets/tiles/decor-rubble.png" },
];
