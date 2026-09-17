import Phaser from "phaser";
import { COLORS, GAME_WIDTH } from "../config/GameConfig";
import { drawEnergyBar } from "./BarRenderer";
import { clamp } from "../utils/MathUtils";

const BAR_WIDTH = 360;
const BAR_HEIGHT = 18;
const BAR_Y = 16;

/** Top-center boss health bar, hidden until the boss phase starts. */
export class BossHealthBar {
  private readonly label: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly x: number;
  // update() is called every frame the boss is alive; skip touching
  // the Graphics's geometry when the ratio hasn't actually changed.
  private lastRatio = -1;
  private isFinal = false;

  constructor(scene: Phaser.Scene) {
    this.x = (GAME_WIDTH - BAR_WIDTH) / 2;

    this.label = scene.add
      .text(GAME_WIDTH / 2, BAR_Y - 4, "BOSS", { fontFamily: "monospace", fontSize: "14px", color: "#ff8fa3" })
      .setShadow(1, 1, "#000000", 3, false, true)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(false);

    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(2500).setVisible(false);
  }

  show(isFinalBoss = false): void {
    this.label.setText(isFinalBoss ? "FINAL BOSS" : "BOSS");
    this.isFinal = isFinalBoss;
    this.lastRatio = 1;
    this.label.setVisible(true);
    this.bar.setVisible(true);
    this.redraw(1);
  }

  hide(): void {
    this.label.setVisible(false);
    this.bar.setVisible(false);
  }

  update(health: number, maxHealth: number): void {
    const ratio = clamp(health / maxHealth, 0, 1);
    if (ratio === this.lastRatio) {
      return;
    }
    this.lastRatio = ratio;
    this.redraw(ratio);
  }

  destroy(): void {
    this.label.destroy();
    this.bar.destroy();
  }

  private redraw(ratio: number): void {
    const fillTop = this.isFinal ? COLORS.finalBossHealthFill : COLORS.bossHealthFill;
    const fillBottom = this.isFinal ? COLORS.finalBossHealthFillDark : COLORS.bossHealthFillDark;

    drawEnergyBar(this.bar, this.x, BAR_Y, BAR_WIDTH, BAR_HEIGHT, ratio, {
      radius: 8,
      trackColor: COLORS.healthBarBg,
      trackAlpha: 1,
      fillColorTop: fillTop,
      fillColorBottom: fillBottom,
      glowColor: fillTop,
    });
  }
}
