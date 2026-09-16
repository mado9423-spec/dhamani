import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";

/** Transient centered banner ("Wave 2/3", "BOSS INCOMING", ...). */
export class Announcement {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, "", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#e6fffb",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2600)
      .setAlpha(0);
  }

  show(message: string): void {
    this.text.scene.tweens.killTweensOf(this.text);
    this.text.setText(message);
    this.text.setAlpha(0);
    this.text.setScale(0.8);

    this.text.scene.tweens.add({
      targets: this.text,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: "Back.Out",
      onComplete: () => {
        this.text.scene.tweens.add({
          targets: this.text,
          alpha: 0,
          delay: 1400,
          duration: 400,
        });
      },
    });
  }

  destroy(): void {
    this.text.destroy();
  }
}
