import Phaser from "phaser";
import { COLORS, GAME_WIDTH } from "../config/GameConfig";
import { describeBestNight } from "../config/SaveConfig";
import { HealthChangedPayload, Player, PlayerEvents, XpChangedPayload } from "../entities/Player";
import { BarStyle, drawEnergyBar } from "./BarRenderer";
import { clamp } from "../utils/MathUtils";
import { SafeAreaInsets } from "../utils/SafeArea";

const BAR_WIDTH = 200;
const HEALTH_BAR_HEIGHT = 14;
const XP_BAR_HEIGHT = 6;
const LOW_HEALTH_RATIO = 0.3;
const TEXT_SHADOW_COLOR = "#000000";

interface Layout {
  barX: number;
  topY: number;
  healthBarY: number;
  xpBarY: number;
  coinsRightX: number;
  waveY: number;
}

const HEALTH_STYLE: BarStyle = {
  radius: 7,
  trackColor: COLORS.healthBarBg,
  trackAlpha: 1,
  fillColorTop: COLORS.healthBarFill,
  fillColorBottom: COLORS.healthBarFillDark,
  glowColor: COLORS.healthBarFill,
};

const HEALTH_STYLE_LOW: BarStyle = {
  ...HEALTH_STYLE,
  fillColorTop: COLORS.healthBarFillLow,
  fillColorBottom: COLORS.healthBarFillLowDark,
  glowColor: COLORS.healthBarFillLow,
};

const XP_STYLE: BarStyle = {
  radius: 3,
  trackColor: COLORS.xpBarBg,
  trackAlpha: 1,
  fillColorTop: COLORS.xpBarFill,
  fillColorBottom: COLORS.xpBarFillDark,
  glowColor: COLORS.xpBarFill,
};

/**
 * Screen-space overlay: title/hint, best-night line, health bar, XP bar +
 * level, and coin count. Stays fixed to the camera and reacts to Player
 * events rather than polling stats every frame. Anchor positions are
 * offset by the device's safe-area insets, recomputed via
 * updateSafeArea() on resize/orientation change so nothing ends up under
 * a notch/status-bar cutout after rotating (mirrors what InputManager
 * already does for the touch controls). Health/XP bars are drawn via
 * `drawEnergyBar()` — rounded, gradient-filled, glow-edged — redrawn on
 * every value change and every reposition, since Graphics has no
 * intrinsic "resize" the way the old flat Rectangle bars did.
 */
export class HUD {
  private readonly player: Player;
  private lastLayout: Layout;
  private lastHealthRatio = 1;
  private lastHealthLow = false;
  private lastXpRatio = 0;

  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly bestText: Phaser.GameObjects.Text;

  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly healthText: Phaser.GameObjects.Text;

  private readonly xpBar: Phaser.GameObjects.Graphics;
  private readonly levelText: Phaser.GameObjects.Text;

  private readonly coinIcon: Phaser.GameObjects.Arc;
  private readonly coinsText: Phaser.GameObjects.Text;
  private readonly waveStatusText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: Player, safeAreaInsets: SafeAreaInsets, bestNightReached: number) {
    this.player = player;
    this.lastLayout = HUD.computeLayout(safeAreaInsets);
    const { barX, topY, healthBarY, xpBarY, coinsRightX, waveY } = this.lastLayout;

    this.title = scene.add
      .text(barX, 12 + topY, "Survive: 7 Nights", { fontFamily: "monospace", fontSize: "20px", color: "#e6fffb" })
      .setShadow(2, 2, TEXT_SHADOW_COLOR, 3, false, true)
      .setScrollFactor(0)
      .setDepth(2000);

    this.hint = scene.add
      .text(barX, 36 + topY, "Move: WASD / Arrows", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
      .setScrollFactor(0)
      .setDepth(2000);

    this.bestText = scene.add
      .text(coinsRightX - 80, 34 + topY, describeBestNight(bestNightReached), {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#8892a6",
      })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000);

    this.healthBar = scene.add.graphics().setScrollFactor(0).setDepth(2000);
    this.healthText = scene.add
      .text(barX + BAR_WIDTH + 8, healthBarY - 1, "", { fontFamily: "monospace", fontSize: "12px", color: "#e6fffb" })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
      .setScrollFactor(0)
      .setDepth(2001);

    this.xpBar = scene.add.graphics().setScrollFactor(0).setDepth(2000);
    this.levelText = scene.add
      .text(barX + BAR_WIDTH + 8, xpBarY - 4, "", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
      .setScrollFactor(0)
      .setDepth(2001);

    this.coinIcon = scene.add
      .circle(coinsRightX - 96, 22 + topY, 7, COLORS.coin)
      .setScrollFactor(0)
      .setDepth(2000);
    this.coinsText = scene.add
      .text(coinsRightX - 80, 14 + topY, "", { fontFamily: "monospace", fontSize: "16px", color: "#ffd54f" })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
      .setScrollFactor(0)
      .setDepth(2000);

    this.waveStatusText = scene.add
      .text(barX, waveY, "", { fontFamily: "monospace", fontSize: "12px", color: "#8892a6" })
      .setShadow(1, 1, TEXT_SHADOW_COLOR, 2, false, true)
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
    this.bestText.destroy();
    this.healthBar.destroy();
    this.healthText.destroy();
    this.xpBar.destroy();
    this.levelText.destroy();
    this.coinIcon.destroy();
    this.coinsText.destroy();
    this.waveStatusText.destroy();
  }

  setWaveStatus(text: string): void {
    this.waveStatusText.setText(text);
  }

  /** Re-anchors every element after the safe-area insets change (resize/orientation). */
  updateSafeArea(safeAreaInsets: SafeAreaInsets): void {
    this.lastLayout = HUD.computeLayout(safeAreaInsets);
    const { barX, topY, healthBarY, xpBarY, coinsRightX, waveY } = this.lastLayout;

    this.title.setPosition(barX, 12 + topY);
    this.hint.setPosition(barX, 36 + topY);
    this.bestText.setPosition(coinsRightX - 80, 34 + topY);

    this.redrawHealthBar();
    this.healthText.setPosition(barX + BAR_WIDTH + 8, healthBarY - 1);

    this.redrawXpBar();
    this.levelText.setPosition(barX + BAR_WIDTH + 8, xpBarY - 4);

    this.coinIcon.setPosition(coinsRightX - 96, 22 + topY);
    this.coinsText.setPosition(coinsRightX - 80, 14 + topY);

    this.waveStatusText.setPosition(barX, waveY);
  }

  private static computeLayout(safeAreaInsets: SafeAreaInsets): Layout {
    const barX = 16 + safeAreaInsets.left;
    const topY = safeAreaInsets.top;
    const healthBarY = 60 + topY;
    const xpBarY = healthBarY + HEALTH_BAR_HEIGHT + 6;
    const coinsRightX = GAME_WIDTH - safeAreaInsets.right;
    const waveY = 94 + topY;
    return { barX, topY, healthBarY, xpBarY, coinsRightX, waveY };
  }

  private redrawHealthBar(): void {
    const { barX, healthBarY } = this.lastLayout;
    const style = this.lastHealthLow ? HEALTH_STYLE_LOW : HEALTH_STYLE;
    drawEnergyBar(this.healthBar, barX, healthBarY, BAR_WIDTH, HEALTH_BAR_HEIGHT, this.lastHealthRatio, style);
  }

  private redrawXpBar(): void {
    const { barX, xpBarY } = this.lastLayout;
    drawEnergyBar(this.xpBar, barX, xpBarY, BAR_WIDTH, XP_BAR_HEIGHT, this.lastXpRatio, XP_STYLE);
  }

  private updateHealth({ health, maxHealth }: HealthChangedPayload): void {
    this.lastHealthRatio = clamp(health / maxHealth, 0, 1);
    this.lastHealthLow = this.lastHealthRatio <= LOW_HEALTH_RATIO;
    this.redrawHealthBar();
    this.healthText.setText(`${Math.ceil(health)}/${maxHealth} HP`);
  }

  private updateXp({ experience, experienceToNextLevel, level }: XpChangedPayload): void {
    this.lastXpRatio = clamp(experience / experienceToNextLevel, 0, 1);
    this.redrawXpBar();
    this.levelText.setText(`Lv. ${level}`);
  }

  private updateCoins({ coins }: { coins: number }): void {
    this.coinsText.setText(`${coins}`);
  }

  private playLevelUpFeedback(): void {
    this.levelText.scene.tweens.killTweensOf(this.levelText);
    this.levelText.scene.tweens.add({
      targets: this.levelText,
      scale: { from: 1.6, to: 1 },
      duration: 220,
      ease: "Back.Out",
    });
  }
}
