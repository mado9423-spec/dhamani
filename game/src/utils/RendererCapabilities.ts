import Phaser from "phaser";

/**
 * All of Phaser's FX pipelines (Bloom, Glow, Vignette, ColorMatrix, and
 * any custom PostFXPipeline) are WebGL-only — they silently do nothing
 * useful on the Canvas2D fallback. This project's game config uses
 * `Phaser.AUTO`, so the renderer can legitimately end up being Canvas on
 * a browser/device without WebGL. Every call site that touches postFX
 * anywhere in this project checks this first and skips gracefully,
 * matching the same safe-degradation pattern already used for
 * `AudioManager` (Web Audio) and `SaveManager` (localStorage).
 */
export function isWebGLRenderer(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}
