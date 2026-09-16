import Phaser from "phaser";
import { PLAYER_FIRE_RANGE, PROJECTILE_SPEED } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { spawnDamageNumber, spawnHitEffect } from "../ui/CombatFeedback";
import { EnemyManager } from "./EnemyManager";
import { PickupManager } from "./PickupManager";
import { ProjectileManager } from "./ProjectileManager";

/**
 * The player auto-fires at the nearest enemy in range. Owns its own
 * projectile and pickup pools since both are strictly combat
 * concerns; only needs a reference to EnemyManager to find targets
 * and resolve hits.
 */
export class CombatSystem {
  private readonly projectileManager: ProjectileManager;
  private readonly pickupManager: PickupManager;
  private fireTimer = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly enemyManager: EnemyManager) {
    this.projectileManager = new ProjectileManager(scene);
    this.pickupManager = new PickupManager(scene);
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

    const direction = new Phaser.Math.Vector2(target.x - player.x, target.y - player.y).normalize();
    this.projectileManager.fire(player.x, player.y, direction, PROJECTILE_SPEED, player.damage);
    this.fireTimer = 1 / player.attackSpeed;
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

        const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y);
        if (distance <= enemy.radius + projectile.radius) {
          this.resolveHit(projectile, enemy);
        }
      });
    });
  }

  private resolveHit(projectile: Projectile, enemy: Enemy): void {
    const damage = projectile.damage;
    projectile.deactivate();

    spawnHitEffect(this.scene, enemy.x, enemy.y, COLORS.projectile);
    spawnDamageNumber(this.scene, enemy.x, enemy.y - enemy.radius, damage);

    const killed = enemy.takeDamage(damage);
    if (killed) {
      this.pickupManager.spawn("xp", enemy.x, enemy.y, enemy.xpReward);
      this.pickupManager.spawn("coin", enemy.x, enemy.y + 6, enemy.coinReward);
    }
  }
}
