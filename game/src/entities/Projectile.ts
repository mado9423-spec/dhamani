import Phaser from "phaser";
import { PROJECTILE_MAX_DISTANCE, PROJECTILE_RADIUS } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";

/**
 * Pooled player projectile. fire() re-activates an existing instance
 * instead of creating a new one. Deactivates itself once it travels
 * past its max range or leaves the world bounds, so it's always
 * returned to the pool even if it never hits anything.
 */
export class Projectile extends Phaser.GameObjects.Arc {
  damage = 0;
  private readonly velocity = new Phaser.Math.Vector2();
  private travelled = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, PROJECTILE_RADIUS, 0, 360, false, COLORS.projectile);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, speed: number, damage: number): void {
    this.setPosition(x, y);
    this.velocity.set(direction.x * speed, direction.y * speed);
    this.damage = damage;
    this.travelled = 0;
    this.setActive(true);
    this.setVisible(true);
  }

  update(deltaSeconds: number, worldBounds: Phaser.Geom.Rectangle): void {
    if (!this.active) {
      return;
    }

    const dx = this.velocity.x * deltaSeconds;
    const dy = this.velocity.y * deltaSeconds;
    this.x += dx;
    this.y += dy;
    this.travelled += Math.hypot(dx, dy);

    if (this.travelled >= PROJECTILE_MAX_DISTANCE || !Phaser.Geom.Rectangle.Contains(worldBounds, this.x, this.y)) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
  }
}
