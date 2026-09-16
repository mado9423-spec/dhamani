import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";
import { EnemyDefinition, EnemyStats, EnemyTypeId, getEnemyDefinition } from "../config/EnemyConfig";
import { clamp } from "../utils/MathUtils";
import { Player } from "./Player";

const HIT_FLASH_MS = 90;
const DEATH_TWEEN_MS = 220;

/**
 * Pooled enemy. spawn() re-configures an existing instance (type,
 * stats, visual, position) instead of creating a new GameObject, so a
 * fixed-size pool can be reused indefinitely. Only a circle shape is
 * used — walker/fast/tank are told apart by size and color.
 */
export class Enemy extends Phaser.GameObjects.Container {
  type: EnemyTypeId = "walker";
  readonly velocity = new Phaser.Math.Vector2();

  private stats: EnemyStats;
  private readonly bodyShape: Phaser.GameObjects.Arc;
  private attackTimer = 0;
  private dying = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const walker = getEnemyDefinition("walker");
    this.stats = { ...walker.stats };
    this.bodyShape = scene.add.circle(0, 0, walker.visual.radius, walker.visual.color);
    this.bodyShape.setStrokeStyle(walker.visual.strokeWidth, walker.visual.strokeColor);

    this.add(this.bodyShape);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  get radius(): number {
    return this.bodyShape.radius;
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

    this.bodyShape.setRadius(definition.visual.radius);
    this.bodyShape.setFillStyle(definition.visual.color);
    this.bodyShape.setStrokeStyle(definition.visual.strokeWidth, definition.visual.strokeColor);
    this.setSize(definition.visual.radius * 2, definition.visual.radius * 2);

    this.setPosition(x, y);
    this.setScale(1);
    this.setAlpha(1);
    this.velocity.set(0, 0);
    this.setActive(true);
    this.setVisible(true);
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

    if (target.isDead) {
      this.velocity.set(0, 0);
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.stats.attackRange) {
      const directionX = dx / distance;
      const directionY = dy / distance;
      const travel = Math.min(this.stats.speed * deltaSeconds, distance - this.stats.attackRange);

      this.velocity.set(directionX * this.stats.speed, directionY * this.stats.speed);
      this.setPosition(
        clamp(this.x + directionX * travel, worldBounds.x + this.radius, worldBounds.right - this.radius),
        clamp(this.y + directionY * travel, worldBounds.y + this.radius, worldBounds.bottom - this.radius)
      );

      this.attackTimer = Math.max(0, this.attackTimer - deltaSeconds);
    } else {
      this.velocity.set(0, 0);
      this.attackTimer -= deltaSeconds;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.stats.attackCooldown;
        target.takeDamage(this.stats.damage);
      }
    }
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

  private playHitFlash(): void {
    this.bodyShape.setFillStyle(COLORS.enemyHitFlash);
    const originalColor = getEnemyDefinition(this.type).visual.color;

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.active && !this.dying) {
        this.bodyShape.setFillStyle(originalColor);
      }
    });
  }

  private die(): void {
    this.dying = true;
    this.velocity.set(0, 0);

    // Stays "active" (so the pool won't reuse it) until the shrink/fade
    // animation finishes, then it's released back to the pool.
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: DEATH_TWEEN_MS,
      ease: "Quad.In",
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
        this.dying = false;
      },
    });
  }
}
