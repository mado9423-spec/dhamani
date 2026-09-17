import Phaser from "phaser";
import { AudioManager } from "../audio/AudioManager";
import {
  ENEMY_PROJECTILE_POOL_SIZE,
  ENEMY_PROJECTILE_SPEED,
  MIN_FIRE_INTERVAL_SECONDS,
  ORB_DAMAGE_MULTIPLIER,
  ORB_PROJECTILE_SPEED,
  PLAYER_FIRE_RANGE,
  PROJECTILE_SPEED,
  SHOTGUN_PELLET_DAMAGE_MULTIPLIER,
  SHOTGUN_PROJECTILE_SPEED,
  SHOTGUN_SPREAD_RADIANS,
} from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { QualitySettings } from "../config/QualityConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { MuzzlePoint } from "../entities/Weapon";
import { ScreenFX } from "../ui/ScreenFX";
import { EffectsManager } from "./EffectsManager";
import { EnemyManager } from "./EnemyManager";
import { PickupManager } from "./PickupManager";
import { ProjectileManager } from "./ProjectileManager";

/**
 * The player auto-fires at the nearest enemy in range. Owns its own
 * projectile/pickup/effects pools since all are strictly combat
 * concerns; only needs a reference to EnemyManager to find targets
 * and resolve hits.
 */
export class CombatSystem {
  private readonly projectileManager: ProjectileManager;
  // "ranged" enemies' bolts — a separate ProjectileManager instance (same
  // Projectile class/visual/pooling pattern as the player's own, just a
  // smaller pool and the opposite collision target) rather than a new
  // class. See handleEnemyRangedAttacks/handleEnemyProjectileCollisions.
  private readonly enemyProjectileManager: ProjectileManager;
  private readonly pickupManager: PickupManager;
  private readonly effectsManager: EffectsManager;
  private readonly scene: Phaser.Scene;
  private readonly quality: QualitySettings;
  private readonly audio: AudioManager;
  private readonly screenFx: ScreenFX;
  // Reused every shot instead of allocating a new Vector2 each time —
  // fire() only reads x/y out of it synchronously, never keeps it.
  private readonly scratchDirection = new Phaser.Math.Vector2();
  private fireTimer = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly enemyManager: EnemyManager,
    quality: QualitySettings,
    audio: AudioManager,
    screenFx: ScreenFX
  ) {
    this.scene = scene;
    this.quality = quality;
    this.audio = audio;
    this.screenFx = screenFx;
    this.effectsManager = new EffectsManager(scene, quality);
    this.projectileManager = new ProjectileManager(scene, (x, y) => this.effectsManager.spawnTrail(x, y));
    this.enemyProjectileManager = new ProjectileManager(
      scene,
      (x, y) => this.effectsManager.spawnTrail(x, y),
      ENEMY_PROJECTILE_POOL_SIZE
    );
    this.pickupManager = new PickupManager(scene);
  }

  update(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    // Existing projectiles move first, *then* a new one may be fired —
    // not the other way around. A projectile fired this frame is
    // positioned at the weapon's muzzle tip (see handleAutoFire); if it
    // also immediately took this same frame's movement step before
    // collisions are checked, a single coarse frame (a slow device, or a
    // melee-range enemy close enough that the muzzle offset plus one
    // step of travel exceeds the hit tolerance) could skip clean over a
    // point-blank enemy without ever having its position checked while
    // still near the muzzle. Checking it at the muzzle first, and only
    // moving it starting next frame, removes that tunneling risk instead
    // of just narrowing it.
    this.projectileManager.update(deltaSeconds, worldBounds);
    this.enemyProjectileManager.update(deltaSeconds, worldBounds);
    this.handleAutoFire(deltaSeconds, player);
    this.handleEnemyRangedAttacks(player);
    this.pickupManager.update(deltaSeconds, player);
    this.handleProjectileCollisions();
    this.handleEnemyProjectileCollisions(player);
  }

  private handleAutoFire(deltaSeconds: number, player: Player): void {
    if (player.isDead) {
      return;
    }

    this.fireTimer -= deltaSeconds;
    if (this.fireTimer > 0) {
      return;
    }

    const target = this.enemyManager.findNearest(player.x, player.y, PLAYER_FIRE_RANGE);
    if (!target) {
      return;
    }

    this.scratchDirection.set(target.x - player.x, target.y - player.y).normalize();

    // The weapon visually aims wherever the cursor is (see Weapon.update,
    // called every frame from Player.update) — firing snaps its recoil
    // and hands back the muzzle tip's current world position, so the
    // shot visibly leaves the blade rather than the player's center. The
    // shot's own travel direction stays the actual combat target
    // (nearest enemy) — the weapon's cursor-aim is presentation, not a
    // change to auto-fire targeting.
    const muzzle = player.weapon.triggerFire(this.scratchDirection);
    this.effectsManager.spawnMuzzleFlash(muzzle.x, muzzle.y, muzzle.angle);

    switch (player.weaponType) {
      case "shotgun":
        this.fireShotgun(muzzle, player);
        break;
      case "orb":
        this.fireOrb(muzzle, player);
        break;
      default:
        this.projectileManager.fire(muzzle.x, muzzle.y, this.scratchDirection, PROJECTILE_SPEED, player.damage, "bolt");
        break;
    }

    // A no-op in vector-art mode (no sprite to animate) — see Player.ts.
    player.playAttackAnimation();
    this.audio.play("fire");
    this.fireTimer = CombatSystem.fireIntervalFor(player.attackSpeed);
  }

  /**
   * Fans player.shotgunPelletCount "pellet" projectiles evenly across
   * SHOTGUN_SPREAD_RADIANS centered on the aim direction that's already
   * in this.scratchDirection — reused sequentially per pellet (each
   * fire() call consumes it synchronously, same as every other caller of
   * this field), rather than one shot straight down the aim line.
   */
  private fireShotgun(muzzle: MuzzlePoint, player: Player): void {
    const baseAngle = Math.atan2(this.scratchDirection.y, this.scratchDirection.x);
    const pelletCount = player.shotgunPelletCount;
    const pelletDamage = Math.max(1, Math.round(player.damage * SHOTGUN_PELLET_DAMAGE_MULTIPLIER));
    const halfSpread = SHOTGUN_SPREAD_RADIANS / 2;

    for (let i = 0; i < pelletCount; i += 1) {
      // A single pellet fires straight down the aim line; more than one
      // fan out symmetrically around it.
      const t = pelletCount === 1 ? 0.5 : i / (pelletCount - 1);
      const angle = baseAngle - halfSpread + t * SHOTGUN_SPREAD_RADIANS;
      this.scratchDirection.set(Math.cos(angle), Math.sin(angle));
      this.projectileManager.fire(muzzle.x, muzzle.y, this.scratchDirection, SHOTGUN_PROJECTILE_SPEED, pelletDamage, "pellet");
    }
  }

  /** One slow "orb" projectile straight down the current aim direction — splash handled on impact, see applySplashDamage(). */
  private fireOrb(muzzle: MuzzlePoint, player: Player): void {
    const orbDamage = Math.max(1, Math.round(player.damage * ORB_DAMAGE_MULTIPLIER));
    this.projectileManager.fire(
      muzzle.x,
      muzzle.y,
      this.scratchDirection,
      ORB_PROJECTILE_SPEED,
      orbDamage,
      "orb",
      player.orbSplashRadius
    );
  }

  // Never lets the auto-fire interval reach zero/negative or go below the
  // configured floor — and never propagates NaN/Infinity from a
  // corrupted/zero attackSpeed into fireTimer, which would otherwise fire
  // every single frame forever (NaN comparisons are always false, so the
  // `fireTimer > 0` guard above would never hold it back).
  private static fireIntervalFor(attackSpeed: number): number {
    if (!Number.isFinite(attackSpeed) || attackSpeed <= 0) {
      return MIN_FIRE_INTERVAL_SECONDS;
    }

    return Math.max(MIN_FIRE_INTERVAL_SECONDS, 1 / attackSpeed);
  }

  /**
   * Drains this frame's "ranged" attack requests (see
   * Enemy.consumeRangedAttackRequest) and fires a hostile bolt at
   * wherever the player currently is for each — a straight shot, not
   * homing, same as the player's own auto-fire.
   */
  private handleEnemyRangedAttacks(player: Player): void {
    if (player.isDead) {
      return;
    }

    this.enemyManager.forEachActive((enemy) => {
      if (!enemy.consumeRangedAttackRequest()) {
        return;
      }

      this.scratchDirection.set(player.x - enemy.x, player.y - enemy.y).normalize();
      this.enemyProjectileManager.fire(enemy.x, enemy.y, this.scratchDirection, ENEMY_PROJECTILE_SPEED, enemy.damage);
    });
  }

  private handleEnemyProjectileCollisions(player: Player): void {
    this.enemyProjectileManager.forEachActive((projectile) => {
      if (!projectile.active) {
        return;
      }

      const dx = projectile.x - player.x;
      const dy = projectile.y - player.y;
      const hitDistance = player.radius + projectile.radius;
      if (dx * dx + dy * dy <= hitDistance * hitDistance) {
        projectile.deactivate();
        player.takeDamage(projectile.damage);
      }
    });
  }

  private handleProjectileCollisions(): void {
    this.projectileManager.forEachActive((projectile) => {
      if (!projectile.active) {
        return;
      }

      this.enemyManager.forEachActive((enemy) => {
        if (!projectile.active || !enemy.active) {
          return;
        }

        // Squared-distance comparison avoids a sqrt per pair — squaring
        // is monotonic for non-negative values, so the <= comparison
        // gives the exact same result as comparing real distances.
        const dx = projectile.x - enemy.x;
        const dy = projectile.y - enemy.y;
        const hitDistance = enemy.radius + projectile.radius;
        if (dx * dx + dy * dy <= hitDistance * hitDistance) {
          this.resolveHit(projectile, enemy);
        }
      });
    });
  }

  private resolveHit(projectile: Projectile, enemy: Enemy): void {
    const damage = projectile.damage;
    const splashRadius = projectile.splashRadius;
    const impactX = projectile.x;
    const impactY = projectile.y;
    const isBoss = enemy.type === "boss" || enemy.type === "finalBoss";
    projectile.deactivate();

    this.effectsManager.spawnHitEffect(enemy.x, enemy.y, COLORS.muzzleSpark);
    this.effectsManager.spawnDamageNumber(enemy.x, enemy.y - enemy.radius, damage);
    this.audio.play("hit");

    // A little extra weight on boss hits specifically — cheap, short, and
    // only ever one at a time since only one boss is ever active.
    if (isBoss && this.quality.screenShakeEnabled) {
      this.scene.cameras.main.shake(60, 0.0015 * this.quality.screenShakeIntensityScale);
      this.screenFx.pulseImpact(0.2, 180);
    }

    this.applyDamage(enemy, damage);

    // > 0 only for "orb" (see Projectile.splashRadius) — every other
    // active enemy within range of the impact point takes the same
    // damage as the one directly hit, on top of it.
    if (splashRadius > 0) {
      this.applySplashDamage(impactX, impactY, splashRadius, damage, enemy);
    }
  }

  private applyDamage(enemy: Enemy, damage: number): void {
    const killed = enemy.takeDamage(damage);
    if (killed) {
      this.audio.play("enemyDeath");
      this.pickupManager.spawn("xp", enemy.x, enemy.y, enemy.xpReward);
      this.pickupManager.spawn("coin", enemy.x, enemy.y + 6, enemy.coinReward);
    }
  }

  private applySplashDamage(x: number, y: number, splashRadius: number, damage: number, excludeEnemy: Enemy): void {
    const radiusSq = splashRadius * splashRadius;

    this.enemyManager.forEachActive((enemy) => {
      if (enemy === excludeEnemy) {
        return;
      }

      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy > radiusSq) {
        return;
      }

      this.effectsManager.spawnHitEffect(enemy.x, enemy.y, COLORS.orbProjectile);
      this.applyDamage(enemy, damage);
    });
  }
}
