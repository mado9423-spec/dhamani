import Phaser from "phaser";
import { MIN_FIRE_INTERVAL_SECONDS, PLAYER_FIRE_RANGE, PROJECTILE_SPEED } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { QualitySettings } from "../config/QualityConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
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
  private readonly pickupManager: PickupManager;
  private readonly effectsManager: EffectsManager;
  // Reused every shot instead of allocating a new Vector2 each time —
  // fire() only reads x/y out of it synchronously, never keeps it.
  private readonly scratchDirection = new Phaser.Math.Vector2();
  private fireTimer = 0;

  constructor(scene: Phaser.Scene, private readonly enemyManager: EnemyManager, quality: QualitySettings) {
    this.projectileManager = new ProjectileManager(scene);
    this.pickupManager = new PickupManager(scene);
    this.effectsManager = new EffectsManager(scene, quality);
  }

  update(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    this.handleAutoFire(deltaSeconds, player);
    this.projectileManager.update(deltaSeconds, worldBounds);
    this.pickupManager.update(deltaSeconds, player);
    this.handleProjectileCollisions();
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
    this.projectileManager.fire(player.x, player.y, this.scratchDirection, PROJECTILE_SPEED, player.damage);
    this.fireTimer = CombatSystem.fireIntervalFor(player.attackSpeed);
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
    projectile.deactivate();

    this.effectsManager.spawnHitEffect(enemy.x, enemy.y, COLORS.projectile);
    this.effectsManager.spawnDamageNumber(enemy.x, enemy.y - enemy.radius, damage);

    const killed = enemy.takeDamage(damage);
    if (killed) {
      this.pickupManager.spawn("xp", enemy.x, enemy.y, enemy.xpReward);
      this.pickupManager.spawn("coin", enemy.x, enemy.y + 6, enemy.coinReward);
    }
  }
}
