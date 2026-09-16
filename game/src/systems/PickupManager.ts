import Phaser from "phaser";
import { PICKUP_POOL_SIZE } from "../config/CombatConfig";
import { Pickup, PickupKind } from "../entities/Pickup";
import { Player } from "../entities/Player";
import { ObjectPool } from "./ObjectPool";

/** Owns the pickup pool: spawning XP/coin drops and their per-frame magnet/collect behavior. */
export class PickupManager {
  private readonly pool: ObjectPool<Pickup>;

  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new ObjectPool(() => new Pickup(this.scene), PICKUP_POOL_SIZE);
  }

  spawn(kind: PickupKind, x: number, y: number, value: number): void {
    if (value <= 0) {
      return;
    }
    this.pool.acquire().spawn(kind, x, y, value);
  }

  update(deltaSeconds: number, player: Player): void {
    this.pool.forEachActive((pickup) => pickup.update(deltaSeconds, player));
  }
}
