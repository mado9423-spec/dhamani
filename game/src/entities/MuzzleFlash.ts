import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

const DURATION_MS = 110;
const START_SCALE = 0.55;

/**
 * Pooled muzzle flash: a jagged crimson spark burst at the weapon's tip
 * on every shot, oriented to the fire angle. Replaces what used to be a
 * silent shot (audio only, no visual) with the "jagged crimson sparks or
 * dark energy bursts" the grim-weaponry pass calls for.
 */
export class MuzzleFlash extends Phaser.GameObjects.Star {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 6, 2, 7, COLORS.muzzleSpark);
    this.setDepth(1450);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, angle: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setPosition(x, y);
    this.setRotation(angle);
    this.setFillStyle(COLORS.muzzleSpark);
    this.setScale(START_SCALE);
    this.setAlpha(1);
    this.setActive(true);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      scaleX: START_SCALE * 2.1,
      scaleY: START_SCALE * 1.2,
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
