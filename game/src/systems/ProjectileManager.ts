import Phaser from "phaser";
import { PROJECTILE_POOL_SIZE } from "../config/CombatConfig";
import { Projectile } from "../entities/Projectile";
import { ObjectPool } from "./ObjectPool";

/** Owns the projectile pool: firing and per-frame movement/expiry. */
export class ProjectileManager {
  private readonly pool: ObjectPool<Projectile>;

  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new ObjectPool(() => new Projectile(this.scene), PROJECTILE_POOL_SIZE);
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, speed: number, damage: number): void {
    // Pool exhausted (extreme fire-rate burst): just skip this shot
    // rather than repositioning one still mid-flight.
    this.pool.acquire()?.fire(x, y, direction, speed, damage);
  }

  update(deltaSeconds: number, worldBounds: Phaser.Geom.Rectangle): void {
    this.pool.forEachActive((projectile) => projectile.update(deltaSeconds, worldBounds));
  }

  forEachActive(callback: (projectile: Projectile) => void): void {
    this.pool.forEachActive(callback);
  }
}
