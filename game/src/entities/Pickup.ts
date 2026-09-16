import Phaser from "phaser";
import { PICKUP_COLLECT_RADIUS, PICKUP_MAGNET_RADIUS, PICKUP_SPEED } from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";
import { Player } from "./Player";

export type PickupKind = "xp" | "coin";

const XP_RADIUS = 5;
const COIN_RADIUS = 7;

/**
 * Pooled XP/coin pickup. Idles until the player enters its magnet
 * radius, then flies toward them and is collected on contact.
 */
export class Pickup extends Phaser.GameObjects.Arc {
  private kind: PickupKind = "xp";
  private value = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, XP_RADIUS, 0, 360, false, COLORS.xpPickup);
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(kind: PickupKind, x: number, y: number, value: number): void {
    this.kind = kind;
    this.value = value;

    this.setPosition(x, y);
    this.setRadius(kind === "coin" ? COIN_RADIUS : XP_RADIUS);
    this.setFillStyle(kind === "coin" ? COLORS.coin : COLORS.xpPickup);
    this.setActive(true);
    this.setVisible(true);
  }

  update(deltaSeconds: number, player: Player): void {
    if (!this.active) {
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= PICKUP_COLLECT_RADIUS) {
      this.collect(player);
      return;
    }

    if (distance <= PICKUP_MAGNET_RADIUS) {
      const pull = Math.min(PICKUP_SPEED * deltaSeconds, distance);
      this.x += (dx / distance) * pull;
      this.y += (dy / distance) * pull;
    }
  }

  private collect(player: Player): void {
    if (this.kind === "xp") {
      player.addExperience(this.value);
    } else {
      player.addCoins(this.value);
    }

    this.setActive(false);
    this.setVisible(false);
  }
}
