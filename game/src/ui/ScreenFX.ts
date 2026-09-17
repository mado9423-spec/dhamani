import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";
import { ImpactFXPipeline } from "../fx/ImpactFXPipeline";
import { isWebGLRenderer } from "../utils/RendererCapabilities";

const FLASH_DEPTH = 1600;
const PARTICLE_DEPTH = 1550;

/**
 * Owns every camera-wide visual effect: the real WebGL Vignette/
 * ColorMatrix pipelines on the main camera, the custom chromatic-
 * aberration/radial-blur ImpactFX pipeline (also camera-level, see
 * fx/ImpactFXPipeline.ts), and screen-space juice (color-grade flash
 * pulses, one-shot particle bursts) that isn't pipeline-based.
 *
 * All postFX use is guarded by `isWebGLRenderer()` — Phaser's FX pipelines
 * are WebGL-only, and this project's `Phaser.AUTO` config can legitimately
 * fall back to Canvas2D — so every method here degrades to a silent no-op
 * on a non-WebGL renderer rather than throwing, matching the same
 * safe-degradation pattern already used by AudioManager (Web Audio) and
 * SaveManager (localStorage).
 */
export class ScreenFX {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly webgl: boolean;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly particles: Phaser.GameObjects.Particles.ParticleEmitter;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private impactPipeline: ImpactFXPipeline | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.webgl = isWebGLRenderer(scene);

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

    this.setupCameraPipelines();
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

  /**
   * A brief chromatic-aberration + radial-blur "hit" pulse on the whole
   * screen — damage taken, a boss hit landing, death, a boss falling.
   * Tweens the pipeline's own `strength` property (not added/removed per
   * call, see ImpactFXPipeline's doc comment) up fast then back down.
   */
  pulseImpact(strength: number, duration: number): void {
    if (!this.impactPipeline) {
      return;
    }

    const pipeline = this.impactPipeline;
    this.scene.tweens.killTweensOf(pipeline);
    pipeline.strength = strength;
    this.scene.tweens.add({
      targets: pipeline,
      strength: 0,
      duration,
      ease: "Cubic.Out",
    });
  }

  /**
   * Progressive atmosphere: darker and colder as the campaign's nights
   * progress. `t` is 0 at Night 1, 1 at Night 7 (and beyond, for the
   * post-campaign/victory state) — see MainScene for how it's derived
   * from the current night index.
   */
  setNightLevel(t: number): void {
    if (!this.colorMatrix) {
      return;
    }

    const clamped = Phaser.Math.Clamp(t, 0, 1);
    this.colorMatrix.reset();
    this.colorMatrix.brightness(1 - 0.28 * clamped);
    this.colorMatrix.saturate(-0.4 * clamped);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.destroy();
    this.particles.destroy();

    // Destroys every FX pipeline instance attached to this camera
    // (Vignette, ColorMatrix, ImpactFX) and clears the camera's
    // postPipelines array — without this, each scene restart would leak
    // a new set of WebGL pipeline instances (and their render targets)
    // on top of the previous run's, since the camera itself persists
    // across Scene.restart().
    if (this.webgl) {
      this.camera.resetPostPipeline(true);
    }
  }

  private setupCameraPipelines(): void {
    if (!this.webgl) {
      return;
    }

    const renderer = this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    // Idempotent — addPostPipeline() itself no-ops if the name is already
    // registered, so calling this on every scene restart is safe and
    // required (a fresh MainScene instance still needs its camera's own
    // pipeline attached, even though the class only needs registering once
    // for the whole Game's lifetime).
    renderer.pipelines.addPostPipeline(ImpactFXPipeline.PIPELINE_NAME, ImpactFXPipeline);

    this.camera.postFX.addVignette(0.5, 0.5, 0.8, 0.35);
    this.colorMatrix = this.camera.postFX.addColorMatrix();
    this.camera.setPostPipeline(ImpactFXPipeline.PIPELINE_NAME);
    this.impactPipeline = this.camera.getPostPipeline(ImpactFXPipeline.PIPELINE_NAME) as ImpactFXPipeline;
  }
}
