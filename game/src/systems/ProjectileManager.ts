import Phaser from "phaser";
import { PROJECTILE_POOL_SIZE } from "../config/CombatConfig";
import { Projectile, ProjectileKind } from "../entities/Projectile";
import { ObjectPool } from "./ObjectPool";

/**
 * Owns a projectile pool: firing and per-frame movement/expiry. Used for
 * the player's own auto-fired bolts (the default pool size), and reused
 * as-is for enemy-fired ones too (see CombatSystem's enemyProjectileManager)
 * with a smaller poolSize override — same Projectile class/visual, same
 * pooling pattern, just a separate pool and collision target.
 */
export class ProjectileManager {
  private readonly pool: ObjectPool<Projectile>;

  constructor(
    private readonly scene: Phaser.Scene,
    onTrail: (x: number, y: number) => void,
    poolSize: number = PROJECTILE_POOL_SIZE
  ) {
    this.pool = new ObjectPool(() => new Projectile(this.scene, onTrail), poolSize);
  }

  fire(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    kind?: ProjectileKind,
    splashRadius?: number
  ): void {
    // Pool exhausted (extreme fire-rate burst): just skip this shot
    // rather than repositioning one still mid-flight.
    this.pool.acquire()?.fire(x, y, direction, speed, damage, kind, splashRadius);
  }

  update(deltaSeconds: number, worldBounds: Phaser.Geom.Rectangle): void {
    this.pool.forEachActive((projectile) => projectile.update(deltaSeconds, worldBounds));
  }

  forEachActive(callback: (projectile: Projectile) => void): void {
    this.pool.forEachActive(callback);
  }
}
