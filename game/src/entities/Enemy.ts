import Phaser from "phaser";
import { enemyAnimKey } from "../config/AnimationConfig";
import { SPRITE_ASSETS_REGISTRY_KEY } from "../config/AssetConfig";
import { COLORS } from "../config/GameConfig";
import { EnemyDefinition, EnemyStats, EnemyTypeId, getEnemyDefinition } from "../config/EnemyConfig";
import { clamp } from "../utils/MathUtils";
import { isWebGLRenderer } from "../utils/RendererCapabilities";
import { Facing, resolveFacing, walkBob } from "../utils/VisualMotion";
import { Player } from "./Player";

const HIT_FLASH_MS = 90;
const DEATH_TWEEN_MS = 220;
const BOB_AMPLITUDE = 1.6;
const BOB_FREQUENCY_HZ = 2.6;
const PULSE_FREQUENCY_HZ = 1.4;
const PULSE_AMPLITUDE = 0.1;
const TWITCH_FREQUENCY_HZ = 3.2;
const LIMB_COUNT = 4;
const LIMB_BASE_ANGLES = [-2.35, -0.8, 0.8, 2.35];
const LIMB_BEND_BASE = 0.9;
const LIMB_TWITCH_AMPLITUDE = 0.35;
const LIMB_BEND_TWITCH_AMPLITUDE = 0.4;

interface LimbRig {
  pivot: Phaser.GameObjects.Container;
  upper: Phaser.GameObjects.Rectangle;
  lowerPivot: Phaser.GameObjects.Container;
  lower: Phaser.GameObjects.Rectangle;
}

/**
 * Pooled enemy. spawn() re-configures an existing instance (type,
 * stats, visual, position) instead of creating a new GameObject, so a
 * fixed-size pool can be reused indefinitely.
 *
 * Two visual styles (see EnemyConfig's EnemyVisualStyle): "slime" — an
 * asymmetrically pulsing void blob (walker/tank) — and "arachnid" — a
 * blob plus twitching multi-segmented limbs (fast/boss/finalBoss). Both
 * share the same rig; slime just never shows its (pre-built, hidden)
 * limbs. As with Player, `this.x`/`this.y` (the outer Container) is the
 * one true physics/collision position — facing flip, bob, pulse, and
 * limb twitch all live on `visualGroup`, a child Container, so the
 * hitbox never moves with the presentation.
 */
export class Enemy extends Phaser.GameObjects.Container {
  type: EnemyTypeId = "walker";
  readonly velocity = new Phaser.Math.Vector2();

  private stats: EnemyStats;
  private hitRadius = 0;
  private readonly hasSpriteAssets: boolean;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly visualGroup: Phaser.GameObjects.Container;
  // Sprite-mode field (see AssetConfig.ts) — null in the (current,
  // default) vector-art mode. Its texture is swapped per spawn() since a
  // pooled Enemy instance is reused across different types over its
  // lifetime.
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  // Vector-art mode fields (the existing zero-asset rendering) — null/
  // empty in sprite mode. Neither branch deletes the other's
  // construction code; exactly one runs, chosen once in the constructor.
  private readonly bodyBlob: Phaser.GameObjects.Ellipse | null;
  private readonly eyeLeft: Phaser.GameObjects.Arc | null;
  private readonly eyeRight: Phaser.GameObjects.Arc | null;
  private readonly limbs: LimbRig[] = [];
  private attackTimer = 0;
  private dying = false;
  private readonly webgl: boolean;
  private readonly phaseSeed = Math.random() * 1000;
  private animTimeMs = 0;
  private facing: Facing = 1;
  private showLimbs = false;
  // Bumped every spawn(). A hit-flash's delayedCall captures this and
  // checks it still matches before touching this (pooled) instance, so
  // it can never revert the color of whatever this slot was reused for
  // in the meantime — correct regardless of how HIT_FLASH_MS and
  // DEATH_TWEEN_MS are tuned relative to each other.
  private lifeId = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.webgl = isWebGLRenderer(scene);
    this.hasSpriteAssets = (scene.registry.get(SPRITE_ASSETS_REGISTRY_KEY) as boolean | undefined) ?? false;

    const walker = getEnemyDefinition("walker");
    this.stats = { ...walker.stats };

    this.shadow = scene.add.ellipse(0, 0, 10, 4, 0x000000, 0.6);
    this.visualGroup = scene.add.container(0, 0);

    if (this.hasSpriteAssets) {
      // Sprite-based rendering — only reachable once real sprite sheets
      // exist (BootScene only sets hasSpriteAssets true if every sheet in
      // AssetConfig.ts loaded, "walker" included), so this project's
      // current zero-asset state never takes this branch. The texture
      // itself is re-picked per spawn() since a pooled instance is reused
      // across different enemy types.
      this.sprite = scene.add.sprite(0, 0, "walker");
      this.sprite.setOrigin(0.5, 0.6);
      this.bodyBlob = null;
      this.eyeLeft = null;
      this.eyeRight = null;
      this.visualGroup.add(this.sprite);
    } else {
      // Existing zero-asset vector-art rendering, unchanged.
      this.sprite = null;
      this.bodyBlob = scene.add.ellipse(0, 0, 20, 17, walker.visual.color);
      this.bodyBlob.setStrokeStyle(walker.visual.strokeWidth, walker.visual.strokeColor);
      this.eyeLeft = scene.add.circle(0, 0, 1.5, walker.visual.eyeColor);
      this.eyeRight = scene.add.circle(0, 0, 1.5, walker.visual.eyeColor);

      for (let i = 0; i < LIMB_COUNT; i += 1) {
        this.limbs.push(Enemy.buildLimb(scene));
      }

      this.visualGroup.add([...this.limbs.map((limb) => limb.pivot), this.bodyBlob, this.eyeLeft, this.eyeRight]);
    }

    this.add([this.shadow, this.visualGroup]);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  private static buildLimb(scene: Phaser.Scene): LimbRig {
    const pivot = scene.add.container(0, 0);
    const upper = scene.add.rectangle(0, 0, 10, 3, 0x000000);
    upper.setOrigin(0, 0.5);

    const lowerPivot = scene.add.container(0, 0);
    const lower = scene.add.rectangle(0, 0, 8, 2.5, 0x000000);
    lower.setOrigin(0, 0.5);

    lowerPivot.add(lower);
    pivot.add([upper, lowerPivot]);

    return { pivot, upper, lowerPivot, lower };
  }

  get radius(): number {
    return this.hitRadius;
  }

  get health(): number {
    return this.stats.health;
  }

  get maxHealth(): number {
    return this.stats.maxHealth;
  }

  get damage(): number {
    return this.stats.damage;
  }

  get xpReward(): number {
    return this.stats.xpReward;
  }

  get coinReward(): number {
    return this.stats.coinReward;
  }

  spawn(type: EnemyTypeId, x: number, y: number, difficultyMultiplier = 1): void {
    const definition: EnemyDefinition = getEnemyDefinition(type);

    this.lifeId += 1;
    this.type = type;
    this.stats = {
      ...definition.stats,
      health: Math.round(definition.stats.health * difficultyMultiplier),
      maxHealth: Math.round(definition.stats.maxHealth * difficultyMultiplier),
      damage: Math.round(definition.stats.damage * difficultyMultiplier),
      xpReward: Math.round(definition.stats.xpReward * difficultyMultiplier),
      coinReward: Math.round(definition.stats.coinReward * difficultyMultiplier),
    };
    this.attackTimer = 0;
    this.dying = false;

    const radius = definition.visual.radius;
    this.hitRadius = radius;

    this.shadow.setSize(radius * 1.6, radius * 0.55);
    this.shadow.setPosition(0, radius * 0.85);

    if (this.sprite) {
      this.sprite.setTexture(type);
      this.sprite.setDisplaySize(radius * 2, radius * 2);
      this.sprite.clearTint();
      const idleKey = enemyAnimKey(type, "idle");
      if (this.scene.anims.exists(idleKey)) {
        this.sprite.play(idleKey);
      }
    } else if (this.bodyBlob && this.eyeLeft && this.eyeRight) {
      this.bodyBlob.setSize(radius * 2, radius * 1.75);
      this.bodyBlob.setFillStyle(definition.visual.color);
      this.bodyBlob.setStrokeStyle(definition.visual.strokeWidth, definition.visual.strokeColor);
      this.eyeLeft.setFillStyle(definition.visual.eyeColor);
      this.eyeRight.setFillStyle(definition.visual.eyeColor);
      this.eyeLeft.setPosition(-radius * 0.28, -radius * 0.15);
      this.eyeRight.setPosition(radius * 0.28, -radius * 0.15);
      this.eyeLeft.setRadius(Math.max(1.2, radius * 0.09));
      this.eyeRight.setRadius(Math.max(1.2, radius * 0.09));

      this.showLimbs = definition.visual.style === "arachnid";
      this.configureLimbs(radius, definition.visual.limbColor);
    }

    this.setSize(radius * 2, radius * 2);
    this.applyBossGlow(type, definition.visual.color);

    this.setPosition(x, y);
    this.setScale(1);
    this.visualGroup.setScale(1, 1);
    this.visualGroup.setPosition(0, 0);
    this.facing = 1;
    this.setAlpha(1);
    this.velocity.set(0, 0);
    this.setActive(true);
    this.setVisible(true);
  }

  private configureLimbs(radius: number, limbColor: number): void {
    const upperLength = radius * 0.85;
    const lowerLength = radius * 0.65;
    const thickness = Math.max(1.5, radius * 0.09);

    this.limbs.forEach((limb, i) => {
      limb.pivot.setVisible(this.showLimbs);
      if (!this.showLimbs) {
        return;
      }

      const baseAngle = LIMB_BASE_ANGLES[i];
      limb.pivot.setPosition(Math.cos(baseAngle) * radius * 0.6, Math.sin(baseAngle) * radius * 0.42);
      limb.pivot.setRotation(baseAngle);

      limb.upper.setSize(upperLength, thickness);
      limb.upper.setFillStyle(limbColor);
      limb.lowerPivot.setPosition(upperLength, 0);
      limb.lowerPivot.setRotation(LIMB_BEND_BASE);
      limb.lower.setSize(lowerLength, thickness * 0.85);
      limb.lower.setFillStyle(limbColor);
    });
  }

  /**
   * Chase the target until within attackRange (stopping there instead
   * of overshooting keeps the enemy from clipping into the player),
   * then attack on cooldown.
   */
  update(deltaSeconds: number, target: Player, worldBounds: Phaser.Geom.Rectangle): void {
    if (!this.active || this.dying) {
      return;
    }

    this.animTimeMs += deltaSeconds * 1000;
    this.updatePulse();

    if (target.isDead) {
      this.velocity.set(0, 0);
      this.updateLimbs(false);
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);
    let moving = false;

    if (distance > this.stats.attackRange) {
      moving = true;
      const directionX = dx / distance;
      const directionY = dy / distance;
      const travel = Math.min(this.stats.speed * deltaSeconds, distance - this.stats.attackRange);

      this.velocity.set(directionX * this.stats.speed, directionY * this.stats.speed);
      this.setPosition(
        clamp(this.x + directionX * travel, worldBounds.x + this.radius, worldBounds.right - this.radius),
        clamp(this.y + directionY * travel, worldBounds.y + this.radius, worldBounds.bottom - this.radius)
      );

      this.attackTimer = Math.max(0, this.attackTimer - deltaSeconds);
      this.facing = resolveFacing(directionX, this.facing);
      this.visualGroup.scaleX = this.facing;
    } else {
      this.velocity.set(0, 0);
      this.attackTimer -= deltaSeconds;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.stats.attackCooldown;
        target.takeDamage(this.stats.damage);
      }
    }

    this.visualGroup.y = walkBob(this.animTimeMs + this.phaseSeed, moving, BOB_AMPLITUDE, BOB_FREQUENCY_HZ);
    this.updateLimbs(moving);
    this.updateSpriteAnimation(moving);
  }

  /** Asymmetric, out-of-sync breathing — always running, the "unstable void slime" look. Vector-art mode only. */
  private updatePulse(): void {
    if (!this.bodyBlob) {
      return;
    }

    const t = this.animTimeMs / 1000;
    const scaleX = 1 + Math.sin(t * PULSE_FREQUENCY_HZ + this.phaseSeed) * PULSE_AMPLITUDE;
    const scaleY = 1 + Math.sin(t * PULSE_FREQUENCY_HZ * 1.3 + this.phaseSeed * 1.7 + 1.1) * PULSE_AMPLITUDE;
    this.bodyBlob.setScale(scaleX, scaleY);
  }

  /** Switches between idle/move clips as movement starts/stops. Sprite mode only, a no-op otherwise. */
  private updateSpriteAnimation(moving: boolean): void {
    if (!this.sprite) {
      return;
    }

    const desired = enemyAnimKey(this.type, moving ? "move" : "idle");
    if (this.scene.anims.exists(desired) && this.sprite.anims.currentAnim?.key !== desired) {
      this.sprite.play(desired);
    }
  }

  /** Eerie multi-joint twitch on each limb, only while actually moving. */
  private updateLimbs(moving: boolean): void {
    if (!this.showLimbs) {
      return;
    }

    const t = this.animTimeMs / 1000;
    this.limbs.forEach((limb, i) => {
      const base = LIMB_BASE_ANGLES[i];
      const twitch = moving ? Math.sin(t * TWITCH_FREQUENCY_HZ + this.phaseSeed + i * 1.3) * LIMB_TWITCH_AMPLITUDE : 0;
      const bendTwitch = moving
        ? Math.sin(t * TWITCH_FREQUENCY_HZ * 1.4 + this.phaseSeed + i * 0.7) * LIMB_BEND_TWITCH_AMPLITUDE
        : 0;
      limb.pivot.setRotation(base + twitch);
      limb.lowerPivot.setRotation(LIMB_BEND_BASE + bendTwitch);
    });
  }

  /** Returns true if this hit killed the enemy. */
  takeDamage(amount: number): boolean {
    if (!this.active || this.dying || amount <= 0) {
      return false;
    }

    this.stats.health = Math.max(0, this.stats.health - amount);
    this.playHitFlash();

    if (this.stats.health <= 0) {
      this.die();
      return true;
    }

    return false;
  }

  /**
   * A real WebGL glow, but only for boss/finalBoss — never the common
   * walker/fast/tank types, which can have up to 40 concurrent instances
   * (see ENEMY_POOL_SIZE); per-object FX at that scale would be a real
   * frame-time cost. A boss is always exactly one at a time, so it's
   * effectively free. This pooled slot may previously have been a boss on
   * an earlier spawn(), so the glow is always reset first regardless of
   * the new type, not just conditionally added.
   */
  private applyBossGlow(type: EnemyTypeId, color: number): void {
    if (!this.webgl) {
      return;
    }

    this.resetPostPipeline();

    if (type === "boss" || type === "finalBoss") {
      this.postFX.addGlow(color, 0.8, 0, false, 0.1, 12);
    }
  }

  private playHitFlash(): void {
    const flashLifeId = this.lifeId;

    if (this.sprite) {
      this.sprite.setTintFill(COLORS.enemyHitFlash);
      this.scene.time.delayedCall(HIT_FLASH_MS, () => {
        if (this.active && !this.dying && this.lifeId === flashLifeId) {
          this.sprite?.clearTint();
        }
      });
      return;
    }

    if (!this.bodyBlob) {
      return;
    }

    this.bodyBlob.setFillStyle(COLORS.enemyHitFlash);
    const originalColor = getEnemyDefinition(this.type).visual.color;

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.active && !this.dying && this.lifeId === flashLifeId) {
        this.bodyBlob?.setFillStyle(originalColor);
      }
    });
  }

  private die(): void {
    this.dying = true;
    this.velocity.set(0, 0);

    if (this.sprite) {
      const deathKey = enemyAnimKey(this.type, "death");
      if (this.scene.anims.exists(deathKey)) {
        this.sprite.play(deathKey);
      }
    }

    // Stays "active" (so the pool won't reuse it) until the shrink/fade
    // animation finishes, then it's released back to the pool. Targets
    // `this` (the whole outer Container, shadow included) — unlike the
    // damage punch, a dying enemy no longer needs its hitbox to stay
    // authoritative (takeDamage/collision already stop touching it via
    // the `dying` guard above), so collapsing everything together,
    // shadow included, reads better than leaving a shadow behind.
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: DEATH_TWEEN_MS,
      ease: "Quad.In",
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
        this.setScale(1);
        this.dying = false;
      },
    });
  }
}
