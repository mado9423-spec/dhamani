import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";
import { UpgradeDefinition } from "../config/UpgradeConfig";

const CARD_WIDTH = 220;
const CARD_HEIGHT = 160;
const CARD_GAP = 24;
const CARD_STROKE = 0x4fd1c5;

interface CardEntry {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  bounds: Phaser.Geom.Rectangle;
  upgrade: UpgradeDefinition;
}

/**
 * Full-screen "choose an upgrade" modal. Hit-testing uses global
 * pointer events + manual rectangle checks (the same technique as
 * VirtualJoystick/FireButton) instead of per-object setInteractive():
 * Phaser's topOnly input sorting doesn't reliably rank a Container
 * child's own depth above a full-screen sibling at a lower depth, so
 * the dim overlay behind the cards was swallowing every click.
 *
 * Takes a way to ask whether PauseOverlay is currently showing, so its own
 * pointer handlers can defer to it: MainScene no longer shows PauseOverlay
 * while an upgrade choice is pending (the upgrade screen is already a
 * valid paused state), but this check is kept as a defensive second layer
 * — if the two ever did end up visible at once, a single tap meant to
 * dismiss "Paused" must not also silently land on a hidden card
 * underneath it. This is a callback rather than a stored PauseOverlay
 * reference specifically so MainScene can keep constructing this class
 * before PauseOverlay — its own pointer listener must stay registered
 * (and therefore fire) first: PauseOverlay's dismiss handler flips
 * `isShowing` to false as its first action, so if PauseOverlay's listener
 * ran before this one on the same tap, the check below would always see
 * the already-dismissed state and never catch anything.
 */
export class UpgradeSelection {
  private readonly scene: Phaser.Scene;
  private readonly isPauseOverlayShowing: () => boolean;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly cards: CardEntry[] = [];
  private onChoose: ((upgrade: UpgradeDefinition) => void) | null = null;
  private active = false;
  private hoveredCard: CardEntry | null = null;

  constructor(scene: Phaser.Scene, isPauseOverlayShowing: () => boolean) {
    this.scene = scene;
    this.isPauseOverlayShowing = isPauseOverlayShowing;

    this.overlay = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(4000)
      .setVisible(false);

    this.title = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130, "Choose an Upgrade", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#e6fffb",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(4001)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  show(options: UpgradeDefinition[], onChoose: (upgrade: UpgradeDefinition) => void): void {
    this.onChoose = onChoose;
    this.active = true;
    this.overlay.setVisible(true);
    this.title.setVisible(true);
    this.scene.input.setDefaultCursor("pointer");
    this.buildCards(options);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.clearCards();
    this.overlay.destroy();
    this.title.destroy();
  }

  private buildCards(options: UpgradeDefinition[]): void {
    this.clearCards();

    const totalWidth = options.length * CARD_WIDTH + (options.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + CARD_WIDTH / 2;
    const y = GAME_HEIGHT / 2 + 10;

    options.forEach((upgrade, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.cards.push(this.createCard(x, y, upgrade));
    });
  }

  private createCard(x: number, y: number, upgrade: UpgradeDefinition): CardEntry {
    const container = this.scene.add.container(x, y).setScrollFactor(0).setDepth(4001);

    const background = this.scene.add
      .rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1a1f2e, 0.95)
      .setStrokeStyle(2, CARD_STROKE, 0.6);

    const icon = this.scene.add.text(0, -40, upgrade.icon, { fontSize: "40px" }).setOrigin(0.5);

    const label = this.scene.add
      .text(0, 30, upgrade.label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#e6fffb",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 24 },
      })
      .setOrigin(0.5);

    container.add([background, icon, label]);

    const bounds = new Phaser.Geom.Rectangle(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
    return { container, background, bounds, upgrade };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.active || this.isPauseOverlayShowing()) {
      return;
    }

    const hit = this.findCardAt(pointer.x, pointer.y);
    if (hit === this.hoveredCard) {
      return;
    }

    this.hoveredCard?.background.setStrokeStyle(2, CARD_STROKE, 0.6);
    this.hoveredCard = hit;
    this.hoveredCard?.background.setStrokeStyle(2, CARD_STROKE, 1);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.active || this.isPauseOverlayShowing()) {
      return;
    }

    const hit = this.findCardAt(pointer.x, pointer.y);
    if (hit) {
      this.choose(hit.upgrade);
    }
  }

  private findCardAt(x: number, y: number): CardEntry | null {
    return this.cards.find((card) => Phaser.Geom.Rectangle.Contains(card.bounds, x, y)) ?? null;
  }

  private choose(upgrade: UpgradeDefinition): void {
    const callback = this.onChoose;
    this.hide();
    callback?.(upgrade);
  }

  private hide(): void {
    this.active = false;
    this.hoveredCard = null;
    this.overlay.setVisible(false);
    this.title.setVisible(false);
    this.scene.input.setDefaultCursor("default");
    this.clearCards();
    this.onChoose = null;
  }

  private clearCards(): void {
    this.cards.forEach((card) => card.container.destroy());
    this.cards.length = 0;
  }
}
