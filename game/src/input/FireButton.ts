import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

/**
 * On-screen fire button. Tracks its own pointer by id (rather than
 * relying on Phaser's GameObject pointerup, which doesn't fire if the
 * finger drags off the button before release) so it can never get
 * stuck "held down".
 */
export class FireButton {
  private readonly scene: Phaser.Scene;
  private readonly hitArea: Phaser.Geom.Circle;
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Triangle;

  private pointerId: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 54) {
    this.scene = scene;
    this.hitArea = new Phaser.Geom.Circle(x, y, radius);

    this.circle = scene.add
      .circle(x, y, radius, COLORS.fireButton, 0.25)
      .setScrollFactor(0)
      .setDepth(1000);
    this.circle.setStrokeStyle(2, COLORS.fireButton, 0.6);

    this.icon = scene.add
      .triangle(
        x,
        y,
        -radius * 0.3,
        -radius * 0.35,
        -radius * 0.3,
        radius * 0.35,
        radius * 0.45,
        0,
        0xffffff,
        0.85
      )
      .setScrollFactor(0)
      .setDepth(1001);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  get isDown(): boolean {
    return this.pointerId !== null;
  }

  /** Re-anchors the button (e.g. after a safe-area/orientation change). */
  setPosition(x: number, y: number): void {
    this.hitArea.x = x;
    this.hitArea.y = y;
    this.circle.setPosition(x, y);
    this.icon.setPosition(x, y);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.circle.destroy();
    this.icon.destroy();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || !Phaser.Geom.Circle.Contains(this.hitArea, pointer.x, pointer.y)) {
      return;
    }

    this.pointerId = pointer.id;
    this.circle.setFillStyle(COLORS.fireButton, 0.5);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }

    this.pointerId = null;
    this.circle.setFillStyle(COLORS.fireButton, 0.25);
  }
}
