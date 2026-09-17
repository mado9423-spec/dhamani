import Phaser from "phaser";

export interface BarStyle {
  radius: number;
  trackColor: number;
  trackAlpha: number;
  fillColorTop: number;
  fillColorBottom: number;
  glowColor: number;
}

/**
 * Redraws a rounded, gradient-filled "energy bar" with a soft glow-style
 * edge halo — entirely via Graphics primitives (rounded rects, a linear
 * gradient fill, layered low-alpha strokes for the halo), so it renders
 * identically on Canvas or WebGL and needs no postFX. Used by HUD's
 * health/XP bars and BossHealthBar, replacing the earlier flat
 * single-color Rectangle bars.
 *
 * Graphics has no notion of "resize" the way Rectangle.width does — every
 * value/position change means clearing and redrawing the whole shape, so
 * this is called on demand (health/XP change, boss health tick, safe-area
 * reposition), not every frame.
 */
export function drawEnergyBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  style: BarStyle
): void {
  graphics.clear();

  const radius = Math.min(style.radius, height / 2);
  const clampedRatio = Phaser.Math.Clamp(ratio, 0, 1);

  // Soft glow halo: a couple of larger, fainter rounded-rect outlines
  // behind the bar in its own accent color — a cheap, blend-mode-free
  // stand-in for a true WebGL glow (see Player/Enemy/Projectile for the
  // real thing) that still reads as "this bar has a glowing edge".
  graphics.lineStyle(4, style.glowColor, 0.1);
  graphics.strokeRoundedRect(x - 3, y - 3, width + 6, height + 6, radius + 3);
  graphics.lineStyle(2, style.glowColor, 0.2);
  graphics.strokeRoundedRect(x - 1, y - 1, width + 2, height + 2, radius + 1);

  // Track.
  graphics.fillStyle(style.trackColor, style.trackAlpha);
  graphics.fillRoundedRect(x, y, width, height, radius);

  // Gradient fill (bright top, deeper shade at the bottom — a classic
  // "glossy energy bar" look), clipped to the current ratio.
  const fillWidth = width * clampedRatio;
  if (fillWidth > 0.5) {
    const fillRadius = Math.min(radius, fillWidth / 2, height / 2);
    graphics.fillGradientStyle(style.fillColorTop, style.fillColorTop, style.fillColorBottom, style.fillColorBottom, 1);
    graphics.fillRoundedRect(x, y, fillWidth, height, fillRadius);
  }

  // Crisp bright edge on top of everything.
  graphics.lineStyle(1.5, style.glowColor, 0.6);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}
