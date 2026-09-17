import Phaser from "phaser";
import { clamp } from "../utils/MathUtils";

/**
 * Applies a velocity (units/second) to a game object for one frame and
 * keeps it inside the given bounds. Kept as a standalone system (rather
 * than logic embedded in an entity) so future entities can reuse it.
 *
 * Deliberately does not rotate the target to face its velocity (the old
 * "360-degree spinning arrow" look) — under the slanted 2.5D perspective,
 * characters stay upright and face the camera, only flipping horizontally
 * (scaleX = 1/-1) based on travel direction. See Player/Enemy's own
 * `applyFacing`-style logic for that.
 */
export class MovementSystem {
  static apply(
    target: Phaser.GameObjects.Container,
    velocity: Phaser.Math.Vector2,
    deltaSeconds: number,
    bounds: Phaser.Geom.Rectangle,
    halfSize: number
  ): void {
    const nextX = target.x + velocity.x * deltaSeconds;
    const nextY = target.y + velocity.y * deltaSeconds;

    target.setPosition(
      clamp(nextX, bounds.x + halfSize, bounds.right - halfSize),
      clamp(nextY, bounds.y + halfSize, bounds.bottom - halfSize)
    );
  }
}
