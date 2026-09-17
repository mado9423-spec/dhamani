import Phaser from "phaser";
import { COLORS } from "../config/GameConfig";

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 56;

/**
 * A single labeled, tappable "Play Again" button shared by DeathScreen and
 * VictoryScreen. Uses the same global-pointer-event + manual
 * Rectangle.Contains hit-testing technique as VirtualJoystick/FireButton/
 * UpgradeSelection — Phaser's topOnly input sorting doesn't reliably rank a
 * Container child's own depth above a full-screen sibling overlay, so
 * per-object setInteractive() isn't used here either. Also activates on
 * Enter/Space when a keyboard is available, without requiring one.
 *
 * Takes a way to ask whether PauseOverlay is currently showing, the same
 * defense-in-depth technique used by UpgradeSelection: PauseOverlay's own
 * "tap anywhere to resume" is unconditional, so without this a single tap
 * meant only to dismiss it could also land on this button underneath and
 * silently restart. See UpgradeSelection's doc comment for why this has
 * to be a lazily-evaluated closure and not a stored reference — the same
 * listener-registration-order requirement applies here (MainScene keeps
 * constructing DeathScreen/VictoryScreen, and so this button, ahead of
 * PauseOverlay).
 */
export class RestartButton {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null;
  private readonly isPauseOverlayShowing: () => boolean;
  private onPress: (() => void) | null = null;
  private shown = false;
  // Guards against a pointer-up and a keydown activating the same button in
  // the same frame from firing the callback twice.
  private activated = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, isPauseOverlayShowing: () => boolean) {
    this.scene = scene;
    this.keyboard = scene.input.keyboard;
    this.isPauseOverlayShowing = isPauseOverlayShowing;

    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(3001).setVisible(false);

    this.background = scene.add
      .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, COLORS.player, 1)
      .setStrokeStyle(2, COLORS.playerOutline, 0.9);

    const text = scene.add
      .text(0, 0, label, { fontFamily: "monospace", fontSize: "18px", color: "#0d0f14" })
      .setOrigin(0.5);

    this.container.add([this.background, text]);
    this.bounds = new Phaser.Geom.Rectangle(x - BUTTON_WIDTH / 2, y - BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT);

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.keyboard?.on("keydown-ENTER", this.handleKeyActivate, this);
    this.keyboard?.on("keydown-SPACE", this.handleKeyActivate, this);
  }

  show(onPress: () => void): void {
    this.onPress = onPress;
    this.shown = true;
    this.activated = false;
    this.background.setFillStyle(COLORS.player, 1);
    this.container.setVisible(true);

    this.scene.tweens.killTweensOf(this.container);
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: "Back.Out",
    });
  }

  hide(): void {
    this.shown = false;
    this.onPress = null;
    this.container.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.keyboard?.off("keydown-ENTER", this.handleKeyActivate, this);
    this.keyboard?.off("keydown-SPACE", this.handleKeyActivate, this);
    this.container.destroy();
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.shown || this.isPauseOverlayShowing()) {
      return;
    }

    const hovered = Phaser.Geom.Rectangle.Contains(this.bounds, pointer.x, pointer.y);
    this.background.setFillStyle(hovered ? COLORS.playerOutline : COLORS.player, 1);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.shown || this.isPauseOverlayShowing()) {
      return;
    }

    if (Phaser.Geom.Rectangle.Contains(this.bounds, pointer.x, pointer.y)) {
      this.activate();
    }
  }

  private handleKeyActivate(): void {
    if (!this.shown || this.isPauseOverlayShowing()) {
      return;
    }

    this.activate();
  }

  private activate(): void {
    if (this.activated) {
      return;
    }

    this.activated = true;
    const callback = this.onPress;

    // A quick "punch" before the button (and everything else on this
    // overlay) is torn down, so the press reads as an intentional hit
    // rather than an instant cut.
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1, to: 0.9 },
      duration: 70,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => {
        this.hide();
        callback?.();
      },
    });
  }
}
