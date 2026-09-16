import Phaser from "phaser";
import {
  ENEMY_POOL_SIZE,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPAWN_MAX_DISTANCE,
  ENEMY_SPAWN_MIN_DISTANCE,
  MAX_CONCURRENT_ENEMIES,
} from "../config/CombatConfig";
import { ENEMY_TYPES } from "../config/EnemyConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { ObjectPool } from "./ObjectPool";

/**
 * Owns the enemy pool: periodic spawning around the player (just
 * outside the viewport) up to a concurrent cap, and per-frame AI
 * updates for every active enemy.
 */
export class EnemyManager {
  private readonly pool: ObjectPool<Enemy>;
  private spawnTimer = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new ObjectPool(() => new Enemy(this.scene), ENEMY_POOL_SIZE);
  }

  update(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    this.pool.forEachActive((enemy) => enemy.update(deltaSeconds, player, worldBounds));

    if (player.isDead) {
      return;
    }

    this.spawnTimer -= deltaSeconds * 1000;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = ENEMY_SPAWN_INTERVAL_MS;
      this.trySpawn(player, worldBounds);
    }
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

  private trySpawn(player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    if (this.pool.activeCount >= MAX_CONCURRENT_ENEMIES) {
      return;
    }

    const type = ENEMY_TYPES[Phaser.Math.Between(0, ENEMY_TYPES.length - 1)];
    const { x, y } = this.randomSpawnPoint(player, worldBounds);
    this.pool.acquire().spawn(type, x, y);
  }

  private randomSpawnPoint(player: Player, worldBounds: Phaser.Geom.Rectangle): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(ENEMY_SPAWN_MIN_DISTANCE, ENEMY_SPAWN_MAX_DISTANCE);

    return {
      x: Phaser.Math.Clamp(player.x + Math.cos(angle) * distance, worldBounds.x + 20, worldBounds.right - 20),
      y: Phaser.Math.Clamp(player.y + Math.sin(angle) * distance, worldBounds.y + 20, worldBounds.bottom - 20),
    };
  }
}
