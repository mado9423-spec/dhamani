import Phaser from "phaser";
import { clamp } from "../utils/MathUtils";

/**
 * Applies velocity-based movement to a game object and keeps it inside
 * the given bounds. Kept as a standalone system (rather than logic
 * embedded in an entity) so future entities can reuse it.
 */
export class MovementSystem {
  static apply(
    target: Phaser.GameObjects.Container,
    direction: Phaser.Math.Vector2,
    speed: number,
    deltaSeconds: number,
    bounds: Phaser.Geom.Rectangle,
    halfSize: number
  ): void {
    const nextX = target.x + direction.x * speed * deltaSeconds;
    const nextY = target.y + direction.y * speed * deltaSeconds;

    target.setPosition(
      clamp(nextX, bounds.x + halfSize, bounds.right - halfSize),
      clamp(nextY, bounds.y + halfSize, bounds.bottom - halfSize)
    );

    if (direction.lengthSq() > 0) {
      const angle = Math.atan2(direction.y, direction.x) + Math.PI / 2;
      target.setRotation(angle);
    }
  }
}
