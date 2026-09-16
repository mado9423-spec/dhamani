import Phaser from "phaser";

/**
 * Screen-space overlay text, independent of world scrolling/scaling.
 * Fixed to the camera so it stays put regardless of gameplay content.
 */
export class HUD {
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.title = scene.add
      .text(16, 12, "Survive: 7 Nights", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#e6fffb",
      })
      .setScrollFactor(0);

    this.hint = scene.add
      .text(16, 40, "Move: WASD / Arrow Keys", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8892a6",
      })
      .setScrollFactor(0);
  }

  destroy(): void {
    this.title.destroy();
    this.hint.destroy();
  }
}
