import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";
import { RestartButton } from "./RestartButton";

/**
 * Full-screen victory overlay, hidden until the Night 7 Final Boss is
 * defeated. Fixed to the camera so it covers the view regardless of
 * world scroll.
 */
export class VictoryScreen {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly restartButton: RestartButton;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.overlay = scene.add
      .rectangle(width / 2, height / 2, width, height, COLORS.overlay, 0.7)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);

    this.title = scene.add
      .text(width / 2, height / 2 - 20, "Victory!", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#4fd1c5",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.subtitle = scene.add
      .text(width / 2, height / 2 + 30, "You survived all 7 nights.", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#e6fffb",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.restartButton = new RestartButton(scene, width / 2, height / 2 + 90, "إعادة اللعب");
  }

  show(onRestart: () => void): void {
    this.overlay.setVisible(true);
    this.title.setVisible(true);
    this.subtitle.setVisible(true);
    this.restartButton.show(onRestart);
  }

  destroy(): void {
    this.overlay.destroy();
    this.title.destroy();
    this.subtitle.destroy();
    this.restartButton.destroy();
  }
}
