import Phaser from "phaser";

/**
 * Fixed-capacity pool of reusable Phaser GameObjects. Reuses an
 * inactive instance when one is available; only creates a new one (up
 * to maxSize) when the pool isn't full yet. Prevents unbounded
 * GameObject creation for frequently spawned things (projectiles,
 * enemies, pickups) — nothing is ever destroyed/recreated per spawn.
 */
export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private readonly items: T[] = [];

  constructor(private readonly factory: () => T, private readonly maxSize: number) {}

  /**
   * Returns an inactive instance, creating one if the pool isn't full
   * yet. Returns null when the pool is genuinely exhausted (maxSize
   * items, all active) — callers must skip that spawn rather than
   * forcing reuse of a still-active item, which would silently
   * teleport/reconfigure something currently alive in the world.
   */
  acquire(): T | null {
    const free = this.items.find((item) => !item.active);
    if (free) {
      return free;
    }

    if (this.items.length < this.maxSize) {
      const created = this.factory();
      this.items.push(created);
      return created;
    }

    return null;
  }

  forEachActive(callback: (item: T) => void): void {
    for (const item of this.items) {
      if (item.active) {
        callback(item);
      }
    }
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) {
      if (item.active) {
        count += 1;
      }
    }
    return count;
  }
}
