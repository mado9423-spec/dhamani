import Phaser from "phaser";

const RISE_DISTANCE = 30;
const DURATION_MS = 500;

/**
 * Pooled floating damage number. spawn() kills any tween still running
 * from a previous life before reconfiguring, so a reused instance can
 * never be caught mid-animation with stale state.
 */
export class DamageNumber extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#ffe08a" });
    this.setOrigin(0.5).setDepth(1500);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, amount: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setText(`-${Math.round(amount)}`);
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setActive(true);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      y: y - RISE_DISTANCE,
      alpha: 0,
      duration: DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      },
    });
  }
}
