import Phaser from "phaser";

/**
 * A random point on a ring around (centerX, centerY), clamped to
 * bounds. Used to place enemies/bosses just outside the viewport
 * regardless of which direction the player is facing.
 */
export function randomRingPoint(
  centerX: number,
  centerY: number,
  minDistance: number,
  maxDistance: number,
  bounds: Phaser.Geom.Rectangle,
  margin = 20
): { x: number; y: number } {
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const distance = Phaser.Math.FloatBetween(minDistance, maxDistance);

  return {
    x: Phaser.Math.Clamp(centerX + Math.cos(angle) * distance, bounds.x + margin, bounds.right - margin),
    y: Phaser.Math.Clamp(centerY + Math.sin(angle) * distance, bounds.y + margin, bounds.bottom - margin),
  };
}
