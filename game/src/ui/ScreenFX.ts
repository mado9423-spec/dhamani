import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";

const VIGNETTE_DEPTH = 1500;
const FLASH_DEPTH = 1600;
const PARTICLE_DEPTH = 1550;

/**
 * Screen-space "juice": a static ambient vignette, short color-grade
 * flash pulses (damage/level-up/victory), and one-shot particle bursts.
 * Pure Shapes/Graphics/Particles — no textures, matching the rest of the
 * project. Phaser's FX pipeline (postFX.addVignette/addColorMatrix) only
 * applies per-GameObject to types that implement PostPipeline (Sprites,
 * Containers) — Rectangle/Arc "Shape" objects used everywhere else in
 * this project don't support it, and a per-object effect wouldn't cover
 * the whole screen anyway, so this draws the vignette by hand instead
 * with a few alpha-stepped rings, which works with any renderer.
 *
 * Sits below the HUD (depth 2000+) so stat text always stays readable,
 * above plain gameplay (default depth ~0).
 */
export class ScreenFX {
  private readonly scene: Phaser.Scene;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly particles: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.drawVignette(scene);

    this.flashRect = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(FLASH_DEPTH);

    // A tiny 1x1 white texture generated once so the particle emitter has
    // something to tint/scale instead of needing an image asset.
    if (!scene.textures.exists("__screenfx_particle")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("__screenfx_particle", 8, 8);
      g.destroy();
    }

    this.particles = scene.add
      .particles(0, 0, "__screenfx_particle", {
        emitting: false,
        lifespan: 700,
        speed: { min: 120, max: 320 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 24,
      })
      .setScrollFactor(0)
      .setDepth(PARTICLE_DEPTH);
  }

  /** Brief full-screen color pulse (damage, level-up, boss defeat, victory). */
  flash(color: number, peakAlpha: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.setFillStyle(color, peakAlpha);
    this.flashRect.setAlpha(1);
    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
    });
  }

  /** One-shot particle burst centered on (x, y) in screen space. */
  burst(x: number, y: number, color: number): void {
    this.particles.setPosition(x, y);
    this.particles.setParticleTint(color);
    this.particles.explode(24);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.destroy();
    this.particles.destroy();
  }

  private drawVignette(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics().setScrollFactor(0).setDepth(VIGNETTE_DEPTH);

    // Layer a few soft, semi-transparent black circles at each corner,
    // largest/faintest first so the smaller/denser ones build up on top —
    // corners end up darker, the center stays clear. Plain additive alpha
    // fills only, so this renders identically (and safely) on both the
    // Canvas and WebGL renderers, with no erase/blend-mode tricks. Drawn
    // once at construction; never redrawn.
    const corners: Array<[number, number]> = [
      [0, 0],
      [GAME_WIDTH, 0],
      [0, GAME_HEIGHT],
      [GAME_WIDTH, GAME_HEIGHT],
    ];
    const rings = [
      { radius: GAME_WIDTH * 0.55, alpha: 0.05 },
      { radius: GAME_WIDTH * 0.38, alpha: 0.06 },
      { radius: GAME_WIDTH * 0.24, alpha: 0.07 },
    ];

    corners.forEach(([cx, cy]) => {
      rings.forEach(({ radius, alpha }) => {
        graphics.fillStyle(0x000000, alpha);
        graphics.fillCircle(cx, cy, radius);
      });
    });
  }
}
