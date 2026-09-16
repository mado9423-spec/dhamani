import { GAME_HEIGHT, GAME_WIDTH } from "./GameConfig";

// Auto-fire
export const PLAYER_FIRE_RANGE = 380;
export const PROJECTILE_SPEED = 520;
export const PROJECTILE_RADIUS = 5;
export const PROJECTILE_MAX_DISTANCE = 440;
export const PROJECTILE_POOL_SIZE = 40;

// Enemies (headroom above the highest concurrent count a wave/boss can
// realistically reach — Night 7's biggest wave alone spawns 75 over
// its duration, though not all concurrently alive).
export const ENEMY_POOL_SIZE = 40;

// Spawn enemies just outside the visible viewport, regardless of
// direction from the player.
const HALF_VIEW_DIAGONAL = Math.hypot(GAME_WIDTH, GAME_HEIGHT) / 2;
export const ENEMY_SPAWN_MIN_DISTANCE = HALF_VIEW_DIAGONAL + 40;
export const ENEMY_SPAWN_MAX_DISTANCE = HALF_VIEW_DIAGONAL + 140;

// Pickups
export const PICKUP_POOL_SIZE = 60;
export const PICKUP_MAGNET_RADIUS = 90;
export const PICKUP_COLLECT_RADIUS = 22;
export const PICKUP_SPEED = 260;

// Damage number / hit effect pool sizes are quality-driven (see
// config/QualityConfig.ts) rather than fixed here — they're purely
// cosmetic, unlike the gameplay pools above.
