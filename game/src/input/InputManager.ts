import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";
import { SafeAreaInsets } from "../utils/SafeArea";
import { FireButton } from "./FireButton";
import { KeyboardInput } from "./KeyboardInput";
import { VirtualJoystick } from "./VirtualJoystick";

const FIRE_BUTTON_MARGIN = 80;

/**
 * Unifies keyboard and on-screen touch controls behind one API so
 * scenes/entities don't need to know which input source is active.
 * Touch controls are only created on touch-capable devices so they
 * never sit on top of the desktop view.
 */
export class InputManager {
  private readonly keyboard: KeyboardInput;
  private readonly joystick: VirtualJoystick | null;
  private readonly fireButton: FireButton | null;

  constructor(scene: Phaser.Scene, safeAreaInsets: SafeAreaInsets) {
    this.keyboard = new KeyboardInput(scene);

    const supportsTouch = scene.sys.game.device.input.touch;
    if (!supportsTouch) {
      this.joystick = null;
      this.fireButton = null;
      return;
    }

    this.joystick = new VirtualJoystick(scene, InputManager.joystickZone(safeAreaInsets));
    const { x, y } = InputManager.fireButtonPosition(safeAreaInsets);
    this.fireButton = new FireButton(scene, x, y);
  }

  getMovementVector(): Phaser.Math.Vector2 {
    if (this.joystick && this.joystick.isActive) {
      return this.joystick.getVector();
    }
    return this.keyboard.getMovementVector();
  }

  isFiring(): boolean {
    return this.fireButton?.isDown ?? false;
  }

  /** Re-anchors touch controls around the current safe area (e.g. after rotating). */
  updateSafeArea(safeAreaInsets: SafeAreaInsets): void {
    this.joystick?.setZone(InputManager.joystickZone(safeAreaInsets));
    const { x, y } = InputManager.fireButtonPosition(safeAreaInsets);
    this.fireButton?.setPosition(x, y);
  }

  destroy(): void {
    this.joystick?.destroy();
    this.fireButton?.destroy();
  }

  // Bottom-left 65% of the screen height, inset from the left/bottom
  // device edges so the joystick never appears under a notch/gesture
  // nav bar, and never under the HUD text pinned to the top-left.
  private static joystickZone(insets: SafeAreaInsets): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      insets.left,
      GAME_HEIGHT * 0.35,
      GAME_WIDTH * 0.5 - insets.left,
      GAME_HEIGHT * 0.65 - insets.bottom
    );
  }

  private static fireButtonPosition(insets: SafeAreaInsets): { x: number; y: number } {
    return {
      x: GAME_WIDTH - FIRE_BUTTON_MARGIN - insets.right,
      y: GAME_HEIGHT - FIRE_BUTTON_MARGIN - insets.bottom,
    };
  }
}
