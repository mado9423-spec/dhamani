import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

const THUMB_RATIO = 0.45;

/**
 * On-screen analog joystick. Appears wherever the player first touches
 * inside its zone (rather than a fixed spot) and tracks that single
 * pointer until release, so it doesn't fight the fire button's pointer
 * on the other side of the screen.
 */
export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly zone: Phaser.Geom.Rectangle;
  private readonly maxRadius: number;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;

  private pointerId: number | null = null;
  private readonly origin = new Phaser.Math.Vector2();
  private readonly vector = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, zone: Phaser.Geom.Rectangle, maxRadius = 55) {
    this.scene = scene;
    this.zone = zone;
    this.maxRadius = maxRadius;

    this.base = scene.add
      .circle(0, 0, maxRadius, COLORS.joystick, 0.15)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);
    this.base.setStrokeStyle(2, COLORS.joystick, 0.35);

    this.thumb = scene.add
      .circle(0, 0, maxRadius * THUMB_RATIO, COLORS.joystick, 0.4)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  get isActive(): boolean {
    return this.pointerId !== null;
  }

  getVector(): Phaser.Math.Vector2 {
    return this.vector.clone();
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || !Phaser.Geom.Rectangle.Contains(this.zone, pointer.x, pointer.y)) {
      return;
    }

    this.pointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
    this.vector.set(0, 0);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }

    const delta = new Phaser.Math.Vector2(pointer.x - this.origin.x, pointer.y - this.origin.y);
    const distance = Math.min(delta.length(), this.maxRadius);
    delta.setLength(distance);

    this.thumb.setPosition(this.origin.x + delta.x, this.origin.y + delta.y);
    this.vector.set(delta.x / this.maxRadius, delta.y / this.maxRadius);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }

    this.pointerId = null;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
    this.vector.set(0, 0);
  }
}
