import Phaser from "phaser";
import { ENEMY_POOL_SIZE } from "../config/CombatConfig";
import { EnemyTypeId } from "../config/EnemyConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { ObjectPool } from "./ObjectPool";

/**
 * Owns the enemy pool: per-frame AI updates for every active enemy,
 * plus a spawnAt() entry point used by NightManager to place wave and
 * boss enemies. Placement timing/counts belong to NightManager — this
 * only knows how to put one enemy of a given type somewhere.
 */
export class EnemyManager {
  private readonly pool: ObjectPool<Enemy>;

  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new ObjectPool(() => new Enemy(this.scene), ENEMY_POOL_SIZE);
  }

  update(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    this.pool.forEachActive((enemy) => enemy.update(deltaSeconds, player, worldBounds));
  }

  spawnAt(type: EnemyTypeId, x: number, y: number): Enemy {
    const enemy = this.pool.acquire();
    enemy.spawn(type, x, y);
    return enemy;
  }

  findNearest(x: number, y: number, maxDistance: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDistance = maxDistance;

    this.pool.forEachActive((enemy) => {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    });

    return nearest;
  }

  forEachActive(callback: (enemy: Enemy) => void): void {
    this.pool.forEachActive(callback);
  }

  get activeCount(): number {
    return this.pool.activeCount;
  }
}
