import Phaser from "phaser";
import { COLORS, GAME_WIDTH } from "../config/GameConfig";
import { HealthChangedPayload, Player, PlayerEvents, XpChangedPayload } from "../entities/Player";
import { clamp } from "../utils/MathUtils";
import { SafeAreaInsets } from "../utils/SafeArea";

const BAR_WIDTH = 200;
const HEALTH_BAR_HEIGHT = 14;
const XP_BAR_HEIGHT = 6;
const LOW_HEALTH_RATIO = 0.3;

/**
 * Screen-space overlay: title/hint, health bar, XP bar + level, and
 * coin count. Stays fixed to the camera and reacts to Player events
 * rather than polling stats every frame. Anchor positions are offset
 * once at construction by the device's safe-area insets, so text
 * doesn't sit under a notch/status-bar cutout.
 */
export class HUD {
  private readonly player: Player;

  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  private readonly healthBarFill: Phaser.GameObjects.Rectangle;
  private readonly healthText: Phaser.GameObjects.Text;

  private readonly xpBarFill: Phaser.GameObjects.Rectangle;
  private readonly levelText: Phaser.GameObjects.Text;

  private readonly coinsText: Phaser.GameObjects.Text;
  private readonly waveStatusText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: Player, safeAreaInsets: SafeAreaInsets) {
    this.player = player;

    const barX = 16 + safeAreaInsets.left;
    const topY = safeAreaInsets.top;
    const healthBarY = 60 + topY;
    const coinsRightX = GAME_WIDTH - safeAreaInsets.right;

    this.title = scene.add
      .text(barX, 12 + topY, "Survive: 7 Nights", { fontFamily: "monospace", fontSize: "20px", color: "#e6fffb" })
      .setScrollFactor(0)
      .setDepth(2000);

    this.hint = scene.add
      .text(barX, 36 + topY, "Move: WASD / Arrows", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setScrollFactor(0)
      .setDepth(2000);

    scene.add
      .rectangle(barX, healthBarY, BAR_WIDTH, HEALTH_BAR_HEIGHT, COLORS.healthBarBg)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    this.healthBarFill = scene.add
      .rectangle(barX, healthBarY, BAR_WIDTH, HEALTH_BAR_HEIGHT, COLORS.healthBarFill)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.healthText = scene.add
      .text(barX + BAR_WIDTH + 8, healthBarY - 1, "", { fontFamily: "monospace", fontSize: "12px", color: "#e6fffb" })
      .setScrollFactor(0)
      .setDepth(2001);

    const xpBarY = healthBarY + HEALTH_BAR_HEIGHT + 6;
    scene.add
      .rectangle(barX, xpBarY, BAR_WIDTH, XP_BAR_HEIGHT, COLORS.xpBarBg)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    this.xpBarFill = scene.add
      .rectangle(barX, xpBarY, 0, XP_BAR_HEIGHT, COLORS.xpBarFill)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.levelText = scene.add
      .text(barX + BAR_WIDTH + 8, xpBarY - 4, "", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setScrollFactor(0)
      .setDepth(2001);

    scene.add
      .circle(coinsRightX - 96, 22 + topY, 7, COLORS.coin)
      .setScrollFactor(0)
      .setDepth(2000);
    this.coinsText = scene.add
      .text(coinsRightX - 80, 14 + topY, "", { fontFamily: "monospace", fontSize: "16px", color: "#ffd54f" })
      .setScrollFactor(0)
      .setDepth(2000);

    this.waveStatusText = scene.add
      .text(barX, 94 + topY, "", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setScrollFactor(0)
      .setDepth(2000);

    player.on(PlayerEvents.HEALTH_CHANGED, this.updateHealth, this);
    player.on(PlayerEvents.XP_CHANGED, this.updateXp, this);
    player.on(PlayerEvents.LEVEL_UP, this.playLevelUpFeedback, this);
    player.on(PlayerEvents.COINS_CHANGED, this.updateCoins, this);

    this.updateHealth({ health: player.health, maxHealth: player.maxHealth });
    this.updateXp({ experience: player.experience, experienceToNextLevel: player.experienceToNextLevel, level: player.level });
    this.updateCoins({ coins: player.coins });
  }

  destroy(): void {
    this.player.off(PlayerEvents.HEALTH_CHANGED, this.updateHealth, this);
    this.player.off(PlayerEvents.XP_CHANGED, this.updateXp, this);
    this.player.off(PlayerEvents.LEVEL_UP, this.playLevelUpFeedback, this);
    this.player.off(PlayerEvents.COINS_CHANGED, this.updateCoins, this);

    this.title.destroy();
    this.hint.destroy();
    this.healthBarFill.destroy();
    this.healthText.destroy();
    this.xpBarFill.destroy();
    this.levelText.destroy();
    this.coinsText.destroy();
    this.waveStatusText.destroy();
  }

  setWaveStatus(text: string): void {
    this.waveStatusText.setText(text);
  }

  private updateHealth({ health, maxHealth }: HealthChangedPayload): void {
    const ratio = clamp(health / maxHealth, 0, 1);
    this.healthBarFill.width = BAR_WIDTH * ratio;
    this.healthBarFill.fillColor = ratio > LOW_HEALTH_RATIO ? COLORS.healthBarFill : COLORS.healthBarFillLow;
    this.healthText.setText(`${Math.ceil(health)}/${maxHealth} HP`);
  }

  private updateXp({ experience, experienceToNextLevel, level }: XpChangedPayload): void {
    const ratio = clamp(experience / experienceToNextLevel, 0, 1);
    this.xpBarFill.width = BAR_WIDTH * ratio;
    this.levelText.setText(`Lv. ${level}`);
  }

  private updateCoins({ coins }: { coins: number }): void {
    this.coinsText.setText(`${coins}`);
  }

  private playLevelUpFeedback(): void {
    this.levelText.scene.tweens.add({
      targets: this.levelText,
      scale: { from: 1.6, to: 1 },
      duration: 220,
      ease: "Back.Out",
    });
  }
}
