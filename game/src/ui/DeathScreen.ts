import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";
import { RestartButton } from "./RestartButton";

/**
 * Full-screen death overlay, hidden until the player dies. Fixed to
 * the camera so it covers the view regardless of world scroll.
 */
export class DeathScreen {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly restartButton: RestartButton;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.overlay = scene.add
      .rectangle(width / 2, height / 2, width, height, COLORS.overlay, 0.7)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);

    this.text = scene.add
      .text(width / 2, height / 2, "You Died", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ff4d4f",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.restartButton = new RestartButton(scene, width / 2, height / 2 + 70, "إعادة اللعب");
  }

  show(onRestart: () => void): void {
    this.overlay.setVisible(true);
    this.text.setVisible(true);
    this.restartButton.show(onRestart);
  }

  destroy(): void {
    this.overlay.destroy();
    this.text.destroy();
    this.restartButton.destroy();
  }
}
