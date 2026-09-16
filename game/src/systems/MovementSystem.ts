import Phaser from "phaser";
import { clamp } from "../utils/MathUtils";

/**
 * Applies a velocity (units/second) to a game object for one frame and
 * keeps it inside the given bounds. Kept as a standalone system (rather
 * than logic embedded in an entity) so future entities can reuse it.
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

    if (velocity.lengthSq() > 0) {
      const angle = Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
      target.setRotation(angle);
    }
  }
}
