import Phaser from "phaser";
import { COLORS, GAME_WIDTH } from "../config/GameConfig";
import { clamp } from "../utils/MathUtils";

const BAR_WIDTH = 360;
const BAR_HEIGHT = 18;
const BAR_Y = 16;

/** Top-center boss health bar, hidden until the boss phase starts. */
export class BossHealthBar {
  private readonly label: Phaser.GameObjects.Text;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const x = (GAME_WIDTH - BAR_WIDTH) / 2;

    this.label = scene.add
      .text(GAME_WIDTH / 2, BAR_Y - 4, "BOSS", { fontFamily: "monospace", fontSize: "14px", color: "#ff8fa3" })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(false);

    this.background = scene.add
      .rectangle(x, BAR_Y, BAR_WIDTH, BAR_HEIGHT, COLORS.healthBarBg)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(false);

    this.fill = scene.add
      .rectangle(x, BAR_Y, BAR_WIDTH, BAR_HEIGHT, COLORS.bossHealthFill)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2501)
      .setVisible(false);
  }

  show(): void {
    this.label.setVisible(true);
    this.background.setVisible(true);
    this.fill.setVisible(true);
  }

  hide(): void {
    this.label.setVisible(false);
    this.background.setVisible(false);
    this.fill.setVisible(false);
  }

  update(health: number, maxHealth: number): void {
    this.fill.width = BAR_WIDTH * clamp(health / maxHealth, 0, 1);
  }

  destroy(): void {
    this.label.destroy();
    this.background.destroy();
    this.fill.destroy();
  }
}
