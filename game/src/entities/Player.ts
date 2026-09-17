import Phaser from "phaser";
import { AudioManager } from "../audio/AudioManager";
import { COLORS } from "../config/GameConfig";
import { createDefaultPlayerStats, getExperienceForLevel, PlayerStats, UpgradeId } from "../config/PlayerConfig";
import { QualitySettings } from "../config/QualityConfig";
import { MAX_UPGRADE_LEVEL, UpgradeDefinition } from "../config/UpgradeConfig";
import { MovementSystem } from "../systems/MovementSystem";
import { ScreenFX } from "../ui/ScreenFX";
import { clamp } from "../utils/MathUtils";
import { isWebGLRenderer } from "../utils/RendererCapabilities";
import { Facing, resolveFacing, walkBob } from "../utils/VisualMotion";
import { Weapon } from "./Weapon";

const BODY_RADIUS = 18;
const DAMAGE_FLASH_MS = 120;
const DAMAGE_PUNCH_SCALE = 0.88;
const DAMAGE_PUNCH_MS = 90;
const BOB_AMPLITUDE = 2.4;
const BOB_FREQUENCY_HZ = 2.15;
const EYE_PULSE_FREQUENCY_HZ = 1.05;

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
 * The player entity — a dark hooded wanderer under a slanted 2.5D
 * perspective. `this.x`/`this.y` (the outer Container, inherited from
 * Phaser.GameObjects.Transform) is the one true physics/collision
 * position and is never touched by presentation; every cosmetic effect
 * (facing flip, walking bob, damage punch, death fade) is applied to
 * `visualGroup`, a child Container, so the hitbox never drifts from
 * what's drawn. `shadow` lives directly on the outer Container (not
 * inside visualGroup) so it stays glued to the ground while the body
 * bobs above it.
 */
export class Player extends Phaser.GameObjects.Container {
  readonly radius = BODY_RADIUS;
  readonly velocity = new Phaser.Math.Vector2();
  readonly weapon: Weapon;

  private readonly stats: PlayerStats;
  private readonly visualGroup: Phaser.GameObjects.Container;
  private readonly cloak: Phaser.GameObjects.Polygon;
  private readonly hood: Phaser.GameObjects.Ellipse;
  private readonly eyeLeft: Phaser.GameObjects.Arc;
  private readonly eyeRight: Phaser.GameObjects.Arc;
  private readonly quality: QualitySettings;
  private readonly audio: AudioManager;
  private readonly screenFx: ScreenFX;
  private dead = false;
  private facing: Facing = 1;
  private animTimeMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, quality: QualitySettings, audio: AudioManager, screenFx: ScreenFX) {
    super(scene, x, y);

    this.quality = quality;
    this.audio = audio;
    this.screenFx = screenFx;
    this.stats = createDefaultPlayerStats();

    // Heavy drop shadow, anchored under the feet — fixed to the ground,
    // never bobs or flips with the body above it.
    const shadow = scene.add.ellipse(0, BODY_RADIUS * 0.82, BODY_RADIUS * 1.7, BODY_RADIUS * 0.6, 0x000000, 0.6);

    this.visualGroup = scene.add.container(0, 0);

    // Cloak: wide at the hem, narrow at the shoulders — a ragged trapezoid
    // rather than a clean silhouette, with two small torn "tatters"
    // hanging off the hem for a worn, gothic edge.
    this.cloak = scene.add.polygon(
      0,
      0,
      [
        -BODY_RADIUS * 0.42,
        -BODY_RADIUS * 0.35,
        BODY_RADIUS * 0.42,
        -BODY_RADIUS * 0.35,
        BODY_RADIUS * 0.88,
        BODY_RADIUS * 0.95,
        BODY_RADIUS * 0.3,
        BODY_RADIUS * 0.7,
        BODY_RADIUS * 0.05,
        BODY_RADIUS * 1.0,
        -BODY_RADIUS * 0.3,
        BODY_RADIUS * 0.68,
        -BODY_RADIUS * 0.88,
        BODY_RADIUS * 0.95,
      ],
      COLORS.player
    );
    this.cloak.setStrokeStyle(1.5, COLORS.playerOutline, 0.5);

    // Hood: a darker overlapping shape at the top, deep enough to read as
    // an empty shadowed opening rather than a face.
    this.hood = scene.add.ellipse(0, -BODY_RADIUS * 0.42, BODY_RADIUS * 1.05, BODY_RADIUS * 1.0, COLORS.playerDead);
    this.hood.setStrokeStyle(1.5, COLORS.playerOutline, 0.35);

    this.eyeLeft = scene.add.circle(-BODY_RADIUS * 0.22, -BODY_RADIUS * 0.4, 1.8, COLORS.playerEyeGlow);
    this.eyeRight = scene.add.circle(BODY_RADIUS * 0.22, -BODY_RADIUS * 0.4, 1.8, COLORS.playerEyeGlow);

    this.visualGroup.add([this.cloak, this.hood, this.eyeLeft, this.eyeRight]);
    this.add([shadow, this.visualGroup]);
    this.setSize(BODY_RADIUS * 2, BODY_RADIUS * 2);
    scene.add.existing(this);

    this.weapon = new Weapon(scene);

    // A single, cheap glow on the one always-on-screen player container —
    // deliberately not applied to the (up to 40-strong) enemy/projectile
    // pools, where per-object WebGL FX at that scale would be a real
    // frame-time cost for a much smaller visual payoff. Tinted to the eye
    // glow color rather than the cloak color so the "piercing glow from
    // the darkness" reads as the dominant light source.
    if (isWebGLRenderer(scene)) {
      this.postFX.addGlow(COLORS.playerEyeGlow, 0.5, 0, false, 0.1, 8);
    }
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
    this.animTimeMs += deltaSeconds * 1000;
    this.pulseEyes();

    if (this.dead) {
      this.velocity.set(0, 0);
      return;
    }

    this.velocity.set(direction.x * this.stats.speed, direction.y * this.stats.speed);
    MovementSystem.apply(this, this.velocity, deltaSeconds, bounds, this.radius);

    const moving = direction.lengthSq() > 0.0001;
    this.facing = resolveFacing(direction.x, this.facing);
    this.visualGroup.scaleX = this.facing;
    this.visualGroup.y = walkBob(this.animTimeMs, moving, BOB_AMPLITUDE, BOB_FREQUENCY_HZ);

    const pointer = this.scene.input.activePointer;
    this.weapon.update(this.x, this.y, pointer.worldX, pointer.worldY, deltaSeconds);
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
    this.audio.play("levelUp");
    this.screenFx.flash(COLORS.xpBarFill, 0.12, 220);
    this.emit(PlayerEvents.LEVEL_UP, { level: this.stats.level });
  }

  /** A slow, ambient pulse on the hood's eyes — always running, not tied to movement. */
  private pulseEyes(): void {
    const alpha = 0.55 + Math.sin((this.animTimeMs / 1000) * EYE_PULSE_FREQUENCY_HZ * Math.PI * 2) * 0.35;
    this.eyeLeft.setAlpha(alpha);
    this.eyeRight.setAlpha(alpha);
  }

  private playDamageFeedback(): void {
    this.cloak.setFillStyle(COLORS.playerDamageFlash);
    if (this.quality.screenShakeEnabled) {
      this.scene.cameras.main.shake(120, 0.004 * this.quality.screenShakeIntensityScale);
    }
    this.audio.play("playerDamage");
    this.screenFx.flash(COLORS.playerDamageFlash, 0.16, 180);
    this.screenFx.pulseImpact(0.35, 260);

    // A quick squash-then-recover punch on top of the color flash —
    // killTweensOf first so rapid repeat hits restart cleanly instead of
    // stacking overlapping tweens. Targets visualGroup (not `this`) so the
    // outer Container's transform — and so its collision radius — never
    // moves during the punch.
    this.scene.tweens.killTweensOf(this.visualGroup);
    this.scene.tweens.add({
      targets: this.visualGroup,
      scale: { from: DAMAGE_PUNCH_SCALE, to: 1 },
      duration: DAMAGE_PUNCH_MS,
      ease: "Sine.Out",
    });

    this.scene.time.delayedCall(DAMAGE_FLASH_MS, () => {
      if (!this.dead) {
        this.cloak.setFillStyle(COLORS.player);
      }
    });
  }

  private die(): void {
    this.dead = true;
    this.velocity.set(0, 0);
    this.cloak.setFillStyle(COLORS.playerDead);
    this.eyeLeft.setAlpha(0.15);
    this.eyeRight.setAlpha(0.15);
    this.setAlpha(0.6);
    this.scene.tweens.killTweensOf(this.visualGroup);
    this.audio.play("playerDeath");
    this.screenFx.flash(0x1a0000, 0.45, 600);
    this.screenFx.pulseImpact(0.75, 900);
    this.screenFx.burst(
      this.x - this.scene.cameras.main.worldView.x,
      this.y - this.scene.cameras.main.worldView.y,
      COLORS.playerDamageFlash
    );
    if (this.quality.screenShakeEnabled) {
      this.scene.cameras.main.shake(320, 0.008 * this.quality.screenShakeIntensityScale);
    }
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
