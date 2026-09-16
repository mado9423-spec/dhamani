import Phaser from "phaser";

const START_SCALE = 0.4;
const END_SCALE = 1.6;
const DURATION_MS = 180;
const START_ALPHA = 0.8;

/**
 * Pooled hit-impact burst. spawn() kills any tween still running from
 * a previous life before reconfiguring, so a reused instance can never
 * be caught mid-animation with stale state.
 */
export class HitEffect extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 8, 0, 360, false, 0xffffff, START_ALPHA);
    this.setDepth(1400);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, color: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setPosition(x, y);
    this.setFillStyle(color, START_ALPHA);
    this.setScale(START_SCALE);
    this.setAlpha(START_ALPHA);
    this.setActive(true);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      scale: END_SCALE,
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
