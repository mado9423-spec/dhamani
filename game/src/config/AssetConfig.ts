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

// Placeholder frame dimensions — this project has never shipped real
// sprite art (see PROJECT_AUDIT.md's zero-asset design decisions), so
// there's nothing yet to measure real frame sizes from. 64x64 only
// matters once a sheet actually loads and needs slicing into frames;
// update these once real art defines the actual grid.
const FRAME_SIZE = { frameWidth: 64, frameHeight: 64 };

export const SPRITE_SHEETS: SpriteSheetDefinition[] = [
  { key: "player_idle", path: "assets/player_idle.png", ...FRAME_SIZE },
  { key: "player_run", path: "assets/player_run.png", ...FRAME_SIZE },
  { key: "player_attack", path: "assets/player_attack.png", ...FRAME_SIZE },
  { key: "walker", path: "assets/walker.png", ...FRAME_SIZE },
  { key: "fast", path: "assets/fast.png", ...FRAME_SIZE },
  { key: "tank", path: "assets/tank.png", ...FRAME_SIZE },
  { key: "boss", path: "assets/boss.png", ...FRAME_SIZE },
  { key: "finalBoss", path: "assets/finalBoss.png", ...FRAME_SIZE },
  { key: "weapon_bolt", path: "assets/weapon_bolt.png", ...FRAME_SIZE },
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
