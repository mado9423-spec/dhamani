import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";
import { createDefaultPlayerStats, getExperienceForLevel, PlayerStats, UpgradeId } from "../config/PlayerConfig";
import { QualitySettings } from "../config/QualityConfig";
import { MAX_UPGRADE_LEVEL, UpgradeDefinition } from "../config/UpgradeConfig";
import { MovementSystem } from "../systems/MovementSystem";
import { clamp } from "../utils/MathUtils";

const BODY_RADIUS = 18;
const DAMAGE_FLASH_MS = 120;

export const PlayerEvents = {
  HEALTH_CHANGED: "player-health-changed",
  XP_CHANGED: "player-xp-changed",
  LEVEL_UP: "player-level-up",
  COINS_CHANGED: "player-coins-changed",
  DIED: "player-died",
} as const;

export interface HealthChangedPayload {
  health: number;
  maxHealth: number;
}

export interface XpChangedPayload {
  experience: number;
  experienceToNextLevel: number;
  level: number;
}

/**
 * The player entity. Position/rotation come from the Container itself
 * (this.x / this.y, inherited from Phaser.GameObjects.Transform);
 * survival stats are tracked separately and exposed as events so UI
 * (HUD) can react without polling every frame. Drawn with Graphics
 * primitives only — no external art in this prototype stage.
 */
export class Player extends Phaser.GameObjects.Container {
  readonly radius = BODY_RADIUS;
  readonly velocity = new Phaser.Math.Vector2();

  private readonly stats: PlayerStats;
  // Named bodyShape (not "body") because GameObject already reserves
  // `body` for an Arcade/Matter physics body reference.
  private readonly bodyShape: Phaser.GameObjects.Triangle;
  private readonly quality: QualitySettings;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, quality: QualitySettings) {
    super(scene, x, y);

    this.quality = quality;
    this.stats = createDefaultPlayerStats();

    this.bodyShape = scene.add.triangle(
      0,
      0,
      0,
      -BODY_RADIUS,
      -BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      COLORS.player
    );
    this.bodyShape.setStrokeStyle(2, COLORS.playerOutline);

    this.add(this.bodyShape);
    this.setSize(BODY_RADIUS * 2, BODY_RADIUS * 2);
    scene.add.existing(this);
  }

  get health(): number {
    return this.stats.health;
  }

  get maxHealth(): number {
    return this.stats.maxHealth;
  }

  get speed(): number {
    return this.stats.speed;
  }

  get damage(): number {
    return this.stats.damage;
  }

  get attackSpeed(): number {
    return this.stats.attackSpeed;
  }

  get experience(): number {
    return this.stats.experience;
  }

  get experienceToNextLevel(): number {
    return this.stats.experienceToNextLevel;
  }

  get level(): number {
    return this.stats.level;
  }

  get coins(): number {
    return this.stats.coins;
  }

  get isDead(): boolean {
    return this.dead;
  }

  update(direction: Phaser.Math.Vector2, deltaSeconds: number, bounds: Phaser.Geom.Rectangle): void {
    if (this.dead) {
      this.velocity.set(0, 0);
      return;
    }

    this.velocity.set(direction.x * this.stats.speed, direction.y * this.stats.speed);
    MovementSystem.apply(this, this.velocity, deltaSeconds, bounds, this.radius);
  }

  takeDamage(amount: number): void {
    if (this.dead || amount <= 0) {
      return;
    }

    this.stats.health = clamp(this.stats.health - amount, 0, this.stats.maxHealth);
    this.emit(PlayerEvents.HEALTH_CHANGED, this.healthPayload());
    this.playDamageFeedback();

    if (this.stats.health <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    if (this.dead || amount <= 0) {
      return;
    }

    this.stats.health = clamp(this.stats.health + amount, 0, this.stats.maxHealth);
    this.emit(PlayerEvents.HEALTH_CHANGED, this.healthPayload());
  }

  addExperience(amount: number): void {
    if (this.dead || amount <= 0) {
      return;
    }

    this.stats.experience += amount;
    while (this.stats.experience >= this.stats.experienceToNextLevel) {
      this.stats.experience -= this.stats.experienceToNextLevel;
      this.levelUp();
    }

    this.emit(PlayerEvents.XP_CHANGED, this.xpPayload());
  }

  addCoins(amount: number): void {
    if (amount <= 0) {
      return;
    }

    this.stats.coins += amount;
    this.emit(PlayerEvents.COINS_CHANGED, { coins: this.stats.coins });
  }

  /** How many times the given upgrade has been picked this run. */
  upgradeLevel(id: UpgradeId): number {
    return this.stats.upgradeLevels[id];
  }

  /**
   * Permanently mutates a stat (level-up upgrade pick). A no-op once that
   * upgrade has reached MAX_UPGRADE_LEVEL — defensive even though the
   * upgrade-selection screen is expected to stop offering maxed upgrades
   * first, so a stat can never be pushed past its intended ceiling.
   */
  applyUpgrade(upgrade: UpgradeDefinition): void {
    if (this.stats.upgradeLevels[upgrade.id] >= MAX_UPGRADE_LEVEL) {
      return;
    }

    this.stats.upgradeLevels[upgrade.id] += 1;
    upgrade.apply(this.stats);
  }

  private levelUp(): void {
    this.stats.level += 1;
    this.stats.experienceToNextLevel = getExperienceForLevel(this.stats.level);
    this.emit(PlayerEvents.LEVEL_UP, { level: this.stats.level });
  }

  private playDamageFeedback(): void {
    this.bodyShape.setFillStyle(COLORS.playerDamageFlash);
    if (this.quality.screenShakeEnabled) {
      this.scene.cameras.main.shake(120, 0.004 * this.quality.screenShakeIntensityScale);
    }
    this.scene.time.delayedCall(DAMAGE_FLASH_MS, () => {
      if (!this.dead) {
        this.bodyShape.setFillStyle(COLORS.player);
      }
    });
  }

  private die(): void {
    this.dead = true;
    this.velocity.set(0, 0);
    this.bodyShape.setFillStyle(COLORS.playerDead);
    this.setAlpha(0.6);
    this.emit(PlayerEvents.DIED);
  }

  private healthPayload(): HealthChangedPayload {
    return { health: this.stats.health, maxHealth: this.stats.maxHealth };
  }

  private xpPayload(): XpChangedPayload {
    return {
      experience: this.stats.experience,
      experienceToNextLevel: this.stats.experienceToNextLevel,
      level: this.stats.level,
    };
  }
}
