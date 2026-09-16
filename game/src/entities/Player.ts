import Phaser from "phaser";
import { COLORS, PLAYER_SPEED } from "../config/GameConfig";
import { MovementSystem } from "../systems/MovementSystem";

const BODY_RADIUS = 18;

/**
 * Prototype player: a triangle drawn with Phaser Graphics primitives
 * (no external art yet) that points toward its last movement direction.
 */
export class Player extends Phaser.GameObjects.Container {
  readonly radius = BODY_RADIUS;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const body = scene.add.triangle(
      0,
      0,
      0,
      -BODY_RADIUS,
      -BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      BODY_RADIUS * 0.8,
      COLORS.player
    );
    body.setStrokeStyle(2, COLORS.playerOutline);

    this.add(body);
    this.setSize(BODY_RADIUS * 2, BODY_RADIUS * 2);
    scene.add.existing(this);
  }

  update(direction: Phaser.Math.Vector2, deltaSeconds: number, bounds: Phaser.Geom.Rectangle): void {
    MovementSystem.apply(this, direction, PLAYER_SPEED, deltaSeconds, bounds, this.radius);
  }
}
