import Phaser from "phaser";
import { COLORS, GAME_WIDTH } from "../config/GameConfig";
import { RestartButton } from "./RestartButton";
import { ScreenFX } from "./ScreenFX";

/**
 * Full-screen victory overlay, hidden until the Night 7 Final Boss is
 * defeated. Fixed to the camera so it covers the view regardless of
 * world scroll.
 */
export class VictoryScreen {
  private readonly scene: Phaser.Scene;
  private readonly screenFx: ScreenFX;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly restartButton: RestartButton;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    screenFx: ScreenFX,
    isPauseOverlayShowing: () => boolean
  ) {
    this.scene = scene;
    this.screenFx = screenFx;

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
      .setShadow(3, 3, "#000000", 8, false, true)
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
      .setShadow(2, 2, "#000000", 4, false, true)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.restartButton = new RestartButton(scene, width / 2, height / 2 + 90, "إعادة اللعب", isPauseOverlayShowing);
  }

  show(onRestart: () => void): void {
    this.overlay.setVisible(true);
    this.title.setVisible(true);
    this.subtitle.setVisible(true);

    this.scene.tweens.killTweensOf([this.overlay, this.title, this.subtitle]);
    this.overlay.setAlpha(0);
    this.title.setAlpha(0);
    this.title.setScale(0.7);
    this.subtitle.setAlpha(0);
    this.scene.tweens.add({ targets: this.overlay, alpha: 0.7, duration: 260 });
    this.scene.tweens.add({
      targets: this.title,
      alpha: 1,
      scale: 1,
      duration: 420,
      ease: "Back.Out",
    });
    this.scene.tweens.add({ targets: this.subtitle, alpha: 1, duration: 400, delay: 180 });

    this.screenFx.burst(GAME_WIDTH / 2, this.title.y, COLORS.xpBarFill);
    this.restartButton.show(onRestart);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.overlay, this.title, this.subtitle]);
    this.overlay.destroy();
    this.title.destroy();
    this.subtitle.destroy();
    this.restartButton.destroy();
  }
}
