import { GAME_HEIGHT, GAME_WIDTH } from "./GameConfig";

// Auto-fire
export const PLAYER_FIRE_RANGE = 380;
export const PROJECTILE_SPEED = 520;
export const PROJECTILE_RADIUS = 5;
export const PROJECTILE_MAX_DISTANCE = 440;
// Shared by every player weapon type — bolt/shotgun/orb are mutually
// exclusive (see WeaponTypeId below), so one pool covers whichever is
// currently equipped. Sized for "Shotgun Rig"'s worst case: up to ~13
// pellets/shot (SHOTGUN_PELLET_COUNT_BASE + MAX_UPGRADE_LEVEL stacks) at
// the ~0.1s MIN_FIRE_INTERVAL_SECONDS floor, each pellet alive for
// ~0.8s before hitting PROJECTILE_MAX_DISTANCE — roughly 8 overlapping
// shots × 13 pellets. A lone bolt or orb per shot never gets close to
// needing this much room; ObjectPool only allocates lazily up to this
// cap, so the unused headroom costs nothing in the common case.
export const PROJECTILE_POOL_SIZE = 120;

// The player's currently-equipped weapon — exactly one at a time (see
// entities/Weapon.ts and PlayerStats.weaponType), switched by picking
// the corresponding UpgradeConfig.ts upgrade; picking that upgrade again
// upgrades whichever is currently equipped further rather than granting
// a second, simultaneously-firing weapon.
export type WeaponTypeId = "bolt" | "shotgun" | "orb";

// "shotgun" — several weaker pellets fired in a spread cone instead of
// one full-damage bolt, each independently checked against enemies (see
// CombatSystem.resolveHit) — strong against a cluster at close/mid
// range, weak against a single far target.
export const SHOTGUN_PELLET_COUNT_BASE = 3;
export const SHOTGUN_SPREAD_RADIANS = 0.5;
export const SHOTGUN_PELLET_DAMAGE_MULTIPLIER = 0.45;
export const SHOTGUN_PROJECTILE_SPEED = 560;

// "orb" — one slow, heavy projectile that splash-damages every enemy
// within orbSplashRadius of its impact point, not just whatever it
// directly hit — the payoff for being slow enough to dodge/outrun and
// only ever landing once per shot.
export const ORB_PROJECTILE_SPEED = 190;
export const ORB_SPLASH_RADIUS_BASE = 50;
export const ORB_SPLASH_RADIUS_PER_LEVEL = 12;
// Measured directly against a stationary, always-in-range dummy — the
// single best case for "bolt" and the single worst case for "orb" (its
// only real downside, being slow enough to dodge/outrun a moving
// target, isn't in play at all against something standing still) — 1.6
// still gave orb ~60% more single-target DPS than bolt (16 vs 10),
// *before* counting orb's free splash damage against anything else
// nearby: strictly better in every measurable way, not a real tradeoff.
// 1.3 keeps a real reward for landing a slow shot (13 vs 10, +30%)
// without stacking it on top of the splash bonus so heavily.
export const ORB_DAMAGE_MULTIPLIER = 1.3;

// Weapon (a separate top-level GameObject that tracks the player's
// position every frame, independent of the player's own facing-flip —
// see entities/Weapon.ts for why it isn't a child of Player's Container).
// Kept deliberately short (well inside the player's own BODY_RADIUS of
// 18, not far beyond it): a projectile fired this frame also travels a
// full frame's distance before collision is checked (see
// CombatSystem.update()'s ordering), so a muzzle reach that eats too far
// into an enemy's attackRange — especially the smallest, 33px on "fast"
// — makes it possible to fire at a melee-range enemy and overshoot it
// entirely in one step. A short reach keeps that risk close to what it
// was when projectiles spawned exactly at the player's center, while
// still visibly leaving the blade rather than the player's exact middle.
export const WEAPON_MOUNT_DISTANCE = 6;
export const WEAPON_LENGTH = 10;
export const WEAPON_SWIVEL_SPEED = 14; // radians/sec angular-lerp rate toward the cursor
export const WEAPON_RECOIL_DISTANCE = 9;
export const WEAPON_RECOIL_RECOVER_MS = 130;

// Hard floor on the delay between auto-fired shots (seconds), regardless
// of how much attackSpeed has been upgraded. At MAX_UPGRADE_LEVEL (see
// UpgradeConfig.ts) attack speed tops out around 9.3/sec (~107ms), so this
// floor is never hit in normal play — it exists as the authoritative
// invariant guarding CombatSystem's `1 / attackSpeed` division itself
// (never 0, negative, NaN, or an unbounded/near-zero interval), independent
// of whatever produced the attackSpeed value.
export const MIN_FIRE_INTERVAL_SECONDS = 0.1;

// Enemies (headroom above the highest concurrent count a wave/boss can
// realistically reach — Night 7's biggest wave alone spawns 75 over
// its duration, though not all concurrently alive).
export const ENEMY_POOL_SIZE = 40;

// "ranged" enemy-fired bolts — reuse the player's own Projectile class/
// visual (see entities/Projectile.ts) in a separate pool, deliberately
// slower than the player's PROJECTILE_SPEED (520) so an incoming shot
// reads as dodgeable rather than an unavoidable tick of damage. Pool
// size is far smaller than PROJECTILE_POOL_SIZE since only the "ranged"
// type ever fires one, and it's gated to mid/late nights (see
// NightConfig.ts).
export const ENEMY_PROJECTILE_SPEED = 240;
export const ENEMY_PROJECTILE_POOL_SIZE = 16;

// "exploder" — AoE burst radius applied once against the player if
// they're standing inside it when the enemy dies. Damage reuses the
// exploder's own EnemyStats.damage (see EnemyConfig.ts) rather than a
// separate stat.
export const EXPLODER_EXPLOSION_RADIUS = 70;

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
