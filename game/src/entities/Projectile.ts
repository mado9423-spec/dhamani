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

// Which weapon fired this specific pooled instance — set fresh on every
// fire() call (see WeaponTypeId in CombatConfig.ts for the player's
// currently-*equipped* weapon; this is the per-shot visual/collision
// identity that follows from it). "pellet" is deliberately a distinct
// name from the "shotgun" weapon type: one shotgun shot fires several
// "pellet" instances at once.
export type ProjectileKind = "bolt" | "pellet" | "orb";

interface ProjectileVisualStyle {
  // Actual hit-circle radius (collision), independent of the rendered
  // ellipse's width/height below.
  hitRadius: number;
  width: number;
  height: number;
  color: number;
  strokeColor: number;
  glowColor: number;
  glowOuterStrength: number;
}

// Each weapon type gets its own projectile silhouette/color so a shot is
// identifiable at a glance: "bolt" (the original weapon) stays the
// existing elongated crimson energy bolt; "pellet" ("Shotgun Rig") is a
// small round amber spark; "orb" ("Void Orb") is a large, slow violet
// sphere. Applied per-shot in applyVisualStyle() rather than baked in at
// construction, since a pooled instance is reused across shots from
// whichever weapon is currently equipped.
const PROJECTILE_VISUALS: Record<ProjectileKind, ProjectileVisualStyle> = {
  bolt: {
    hitRadius: PROJECTILE_RADIUS,
    width: PROJECTILE_RADIUS * 2.6,
    height: PROJECTILE_RADIUS * 1.4,
    color: COLORS.projectile,
    strokeColor: COLORS.projectileGlow,
    glowColor: COLORS.projectile,
    glowOuterStrength: 6,
  },
  pellet: {
    hitRadius: PROJECTILE_RADIUS * 0.65,
    width: PROJECTILE_RADIUS * 1.3,
    height: PROJECTILE_RADIUS * 1.3,
    color: COLORS.pelletProjectile,
    strokeColor: COLORS.pelletProjectileGlow,
    glowColor: COLORS.pelletProjectile,
    glowOuterStrength: 5,
  },
  orb: {
    hitRadius: PROJECTILE_RADIUS * 2.2,
    width: PROJECTILE_RADIUS * 4.4,
    height: PROJECTILE_RADIUS * 4.4,
    color: COLORS.orbProjectile,
    strokeColor: COLORS.orbProjectileGlow,
    glowColor: COLORS.orbProjectile,
    glowOuterStrength: 10,
  },
};

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
  radius = PROJECTILE_RADIUS;
  damage = 0;
  kind: ProjectileKind = "bolt";
  // > 0 only for "orb" — see CombatSystem.applySplashDamage().
  splashRadius = 0;
  // Exactly one of these is non-null, chosen once in the constructor —
  // same dual-path pattern as Player/Enemy/Weapon (see AssetConfig.ts).
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  private readonly bodyShape: Phaser.GameObjects.Ellipse | null;
  private readonly webgl: boolean;
  private readonly velocity = new Phaser.Math.Vector2();
  private travelled = 0;
  private trailAccum = 0;

  constructor(scene: Phaser.Scene, private readonly onTrail: (x: number, y: number) => void) {
    super(scene, 0, 0);

    this.webgl = isWebGLRenderer(scene);
    const hasSpriteAssets = (scene.registry.get(SPRITE_ASSETS_REGISTRY_KEY) as boolean | undefined) ?? false;
    if (hasSpriteAssets) {
      // Reuses the same weapon_bolt sheet as the held weapon (see
      // Weapon.ts) — only reachable once that sheet actually exists;
      // this project's current zero-asset state never takes this branch.
      // Every ProjectileKind shares this one texture, tinted per kind in
      // applyVisualStyle() below (no dedicated art per weapon yet).
      this.sprite = scene.add.sprite(0, 0, "weapon_bolt");
      this.bodyShape = null;
      this.add(this.sprite);
    } else {
      // Existing zero-asset vector-art rendering — dimensions/color are
      // reset per shot in applyVisualStyle(), not fixed here.
      this.sprite = null;
      this.bodyShape = scene.add.ellipse(0, 0, PROJECTILE_RADIUS * 2.6, PROJECTILE_RADIUS * 1.4, COLORS.projectile);
      this.bodyShape.setStrokeStyle(1.5, COLORS.projectileGlow, 0.85);
      this.add(this.bodyShape);
    }

    this.setSize(PROJECTILE_RADIUS * 2, PROJECTILE_RADIUS * 2);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  fire(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    kind: ProjectileKind = "bolt",
    splashRadius = 0
  ): void {
    this.kind = kind;
    this.splashRadius = splashRadius;
    this.applyVisualStyle(kind);
    this.setPosition(x, y);
    this.setRotation(Math.atan2(direction.y, direction.x));
    this.velocity.set(direction.x * speed, direction.y * speed);
    this.damage = damage;
    this.travelled = 0;
    this.trailAccum = 0;
    this.setActive(true);
    this.setVisible(true);
  }

  /** Re-skins this pooled instance for whichever weapon just fired it — see PROJECTILE_VISUALS. */
  private applyVisualStyle(kind: ProjectileKind): void {
    const style = PROJECTILE_VISUALS[kind];
    this.radius = style.hitRadius;

    if (this.sprite) {
      this.sprite.setTint(style.color);
    } else if (this.bodyShape) {
      this.bodyShape.setSize(style.width, style.height);
      this.bodyShape.setFillStyle(style.color);
      this.bodyShape.setStrokeStyle(1.5, style.strokeColor, 0.85);
    }

    if (this.webgl) {
      this.resetPostPipeline();
      this.postFX.addGlow(style.glowColor, 0.7, 0, false, 0.15, style.glowOuterStrength);
    }
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
