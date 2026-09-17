import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";

/**
 * Shown while the game is paused because the page went to the
 * background (tab hidden / app switched away on mobile). Phaser's own
 * engine already halts the update loop the instant the page hides and
 * resumes it the instant it's visible again — but resuming gameplay
 * that abruptly, with no warning, can drop the player right back into
 * whatever was happening around them. This gate requires an explicit
 * tap before gameplay actually continues, which is the "safe" part of
 * resuming.
 */
export class PauseOverlay {
  private readonly scene: Phaser.Scene;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private onResume: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.overlay = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.overlay, 0.8)
      .setScrollFactor(0)
      .setDepth(5000)
      .setVisible(false);

    this.title = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 16, "Paused", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#e6fffb",
      })
      .setShadow(2, 2, "#000000", 5, false, true)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001)
      .setVisible(false);

    this.subtitle = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, "Tap to resume", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8892a6",
      })
      .setShadow(1, 1, "#000000", 3, false, true)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  show(onResume: () => void): void {
    this.onResume = onResume;
    this.overlay.setVisible(true);
    this.title.setVisible(true);
    this.subtitle.setVisible(true);

    this.scene.tweens.killTweensOf([this.overlay, this.title, this.subtitle]);
    this.overlay.setAlpha(0);
    this.title.setAlpha(0);
    this.subtitle.setAlpha(0);
    this.scene.tweens.add({ targets: this.overlay, alpha: 0.8, duration: 200 });
    this.scene.tweens.add({ targets: [this.title, this.subtitle], alpha: 1, duration: 240, delay: 60 });
  }

  get isShowing(): boolean {
    return this.overlay.visible;
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.scene.tweens.killTweensOf([this.overlay, this.title, this.subtitle]);
    this.overlay.destroy();
    this.title.destroy();
    this.subtitle.destroy();
  }

  private handlePointerUp(): void {
    if (!this.overlay.visible) {
      return;
    }

    const callback = this.onResume;
    this.onResume = null;
    this.scene.tweens.killTweensOf([this.overlay, this.title, this.subtitle]);
    this.overlay.setVisible(false);
    this.title.setVisible(false);
    this.subtitle.setVisible(false);
    callback?.();
  }
}
