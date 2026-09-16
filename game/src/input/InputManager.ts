import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";
import { FireButton } from "./FireButton";
import { KeyboardInput } from "./KeyboardInput";
import { VirtualJoystick } from "./VirtualJoystick";

// Bottom-left 65% of the screen height, so the joystick never appears
// under the HUD text pinned to the top-left corner.
const JOYSTICK_ZONE = new Phaser.Geom.Rectangle(0, GAME_HEIGHT * 0.35, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.65);
const FIRE_BUTTON_X = GAME_WIDTH - 80;
const FIRE_BUTTON_Y = GAME_HEIGHT - 80;

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

  constructor(scene: Phaser.Scene) {
    this.keyboard = new KeyboardInput(scene);

    const supportsTouch = scene.sys.game.device.input.touch;
    this.joystick = supportsTouch ? new VirtualJoystick(scene, JOYSTICK_ZONE) : null;
    this.fireButton = supportsTouch ? new FireButton(scene, FIRE_BUTTON_X, FIRE_BUTTON_Y) : null;
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

  destroy(): void {
    this.joystick?.destroy();
    this.fireButton?.destroy();
  }
}
