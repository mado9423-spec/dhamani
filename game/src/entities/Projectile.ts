import Phaser from "phaser";
import { SPRITE_ASSETS_REGISTRY_KEY } from "../config/AssetConfig";
import { PROJECTILE_MAX_DISTANCE, PROJECTILE_RADIUS } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { isWebGLRenderer } from "../utils/RendererCapabilities";

// How far a projectile travels (px) between smoke-trail dots — throttled
// rather than spawned every frame, or a fire-rate burst across up to
// PROJECTILE_POOL_SIZE concurrent bolts would flood the trail pool with
// one dot per bolt per frame.
const TRAIL_INTERVAL_PX = 14;

/**
 * Pooled player projectile — a dark energy bolt with a crimson core,
 * oriented to face its own travel direction (fire() sets rotation once;
 * a projectile doesn't turn mid-flight, so unlike characters this is a
 * one-time rotation, not something the no-spin/facing-flip rule applies
 * to). Leaves a faint, throttled smoke trail behind it via the onTrail
 * callback (see ProjectileManager/EffectsManager.spawnTrail).
 *
 * A Container wrapping a single Ellipse (rather than being an Ellipse
 * directly, as in earlier versions) specifically so it can carry a real
 * WebGL glow — Phaser's FX pipeline only applies to GameObjects that
 * implement PostPipeline (Sprite, Container), not plain Shapes like
 * Arc/Rectangle. Glow is cheap per-instance (it only processes this
 * object's own small render footprint, not the whole screen), so it's
 * safe to apply to every pooled instance up to PROJECTILE_POOL_SIZE —
 * unlike Enemy, which only glows its boss slot specifically.
 */
export class Projectile extends Phaser.GameObjects.Container {
  readonly radius = PROJECTILE_RADIUS;
  damage = 0;
  // Exactly one of these is non-null, chosen once in the constructor —
  // same dual-path pattern as Player/Enemy/Weapon (see AssetConfig.ts).
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  private readonly bodyShape: Phaser.GameObjects.Ellipse | null;
  private readonly velocity = new Phaser.Math.Vector2();
  private travelled = 0;
  private trailAccum = 0;

  constructor(scene: Phaser.Scene, private readonly onTrail: (x: number, y: number) => void) {
    super(scene, 0, 0);

    const hasSpriteAssets = (scene.registry.get(SPRITE_ASSETS_REGISTRY_KEY) as boolean | undefined) ?? false;
    if (hasSpriteAssets) {
      // Reuses the same weapon_bolt sheet as the held weapon (see
      // Weapon.ts) — only reachable once that sheet actually exists;
      // this project's current zero-asset state never takes this branch.
      this.sprite = scene.add.sprite(0, 0, "weapon_bolt");
      this.bodyShape = null;
      this.add(this.sprite);
    } else {
      // Existing zero-asset vector-art rendering, unchanged.
      this.sprite = null;
      this.bodyShape = scene.add.ellipse(0, 0, PROJECTILE_RADIUS * 2.6, PROJECTILE_RADIUS * 1.4, COLORS.projectile);
      this.bodyShape.setStrokeStyle(1.5, COLORS.projectileGlow, 0.85);
      this.add(this.bodyShape);
    }

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
    this.setRotation(Math.atan2(direction.y, direction.x));
    this.velocity.set(direction.x * speed, direction.y * speed);
    this.damage = damage;
    this.travelled = 0;
    this.trailAccum = 0;
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
    const stepDistance = Math.hypot(dx, dy);
    this.travelled += stepDistance;

    this.trailAccum += stepDistance;
    if (this.trailAccum >= TRAIL_INTERVAL_PX) {
      this.trailAccum = 0;
      this.onTrail(this.x, this.y);
    }

    if (this.travelled >= PROJECTILE_MAX_DISTANCE || !Phaser.Geom.Rectangle.Contains(worldBounds, this.x, this.y)) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
  }
}
