import Phaser from "phaser";
import { PROJECTILE_MAX_DISTANCE, PROJECTILE_RADIUS } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { isWebGLRenderer } from "../utils/RendererCapabilities";

/**
 * Pooled player projectile. fire() re-activates an existing instance
 * instead of creating a new one. Deactivates itself once it travels
 * past its max range or leaves the world bounds, so it's always
 * returned to the pool even if it never hits anything.
 *
 * A Container wrapping a single Arc (rather than being an Arc directly,
 * as in earlier versions) specifically so it can carry a real WebGL glow
 * — Phaser's FX pipeline only applies to GameObjects that implement
 * PostPipeline (Sprite, Container), not plain Shapes like Arc/Rectangle.
 * Glow is cheap per-instance (it only processes this object's own small
 * render footprint, not the whole screen), so it's safe to apply to every
 * pooled instance up to PROJECTILE_POOL_SIZE — unlike Enemy, which only
 * glows its boss slot specifically.
 */
export class Projectile extends Phaser.GameObjects.Container {
  readonly radius = PROJECTILE_RADIUS;
  damage = 0;
  private readonly bodyShape: Phaser.GameObjects.Arc;
  private readonly velocity = new Phaser.Math.Vector2();
  private travelled = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.bodyShape = scene.add.circle(0, 0, PROJECTILE_RADIUS, COLORS.projectile);
    this.add(this.bodyShape);
    this.setSize(PROJECTILE_RADIUS * 2, PROJECTILE_RADIUS * 2);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);

    if (isWebGLRenderer(scene)) {
      this.postFX.addGlow(COLORS.projectile, 0.7, 0, false, 0.15, 6);
    }
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
