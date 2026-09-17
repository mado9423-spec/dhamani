import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";
import { RestartButton } from "./RestartButton";

/**
 * Full-screen death overlay, hidden until the player dies. Fixed to
 * the camera so it covers the view regardless of world scroll.
 */
export class DeathScreen {
  private readonly scene: Phaser.Scene;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly restartButton: RestartButton;

  constructor(scene: Phaser.Scene, width: number, height: number, isPauseOverlayShowing: () => boolean) {
    this.scene = scene;

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
      .setShadow(3, 3, "#000000", 6, false, true)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.restartButton = new RestartButton(scene, width / 2, height / 2 + 70, "إعادة اللعب", isPauseOverlayShowing);
  }

  show(onRestart: () => void): void {
    this.overlay.setVisible(true);
    this.text.setVisible(true);

    this.scene.tweens.killTweensOf([this.overlay, this.text]);
    this.overlay.setAlpha(0);
    this.text.setAlpha(0);
    this.text.setScale(1.15);
    this.scene.tweens.add({ targets: this.overlay, alpha: 0.7, duration: 260 });
    this.scene.tweens.add({
      targets: this.text,
      alpha: 1,
      scale: 1,
      duration: 320,
      ease: "Sine.Out",
    });

    this.restartButton.show(onRestart);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.overlay, this.text]);
    this.overlay.destroy();
    this.text.destroy();
    this.restartButton.destroy();
  }
}
