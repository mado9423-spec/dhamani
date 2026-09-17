import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

const DURATION_MS = 220;
const START_RADIUS = 3;

/**
 * Pooled trail dot: a small fading smudge of dark smoke left behind a
 * flying projectile. Projectile.update() calls EffectsManager.spawnTrail
 * every few pixels of travel (not every frame — see Projectile's own
 * throttling) so a burst of shots doesn't flood the pool with one dot
 * per frame per projectile.
 */
export class ProjectileTrail extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, START_RADIUS, 0, 360, false, COLORS.smokeTrail, 0.55);
    this.setDepth(1350);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setPosition(x, y);
    this.setRadius(START_RADIUS);
    this.setAlpha(0.55);
    this.setActive(true);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      scale: 0.2,
      alpha: 0,
      duration: DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
        this.setScale(1);
      },
    });
  }
}
