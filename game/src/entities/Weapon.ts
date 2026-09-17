import Phaser from "phaser";
import { SPRITE_ASSETS_REGISTRY_KEY } from "../config/AssetConfig";
import {
  WEAPON_LENGTH,
  WEAPON_MOUNT_DISTANCE,
  WEAPON_RECOIL_DISTANCE,
  WEAPON_RECOIL_RECOVER_MS,
  WEAPON_SWIVEL_SPEED,
  WeaponTypeId,
} from "../config/CombatConfig";
import { COLORS } from "../config/GameConfig";

export interface MuzzlePoint {
  x: number;
  y: number;
  angle: number;
}

/**
 * The player's held weapon — a dark hilt and a pale, worn blade, always
 * swiveling toward the cursor. Deliberately NOT a child of Player's
 * Container: a child's local rotation visually mirrors when its parent
 * is horizontally flipped (Player's own facing-flip, scaleX = 1/-1),
 * which would make "point at the cursor" periodically point the wrong
 * way. Instead this is a sibling top-level GameObject whose position is
 * synced to the player every frame (see update()) and whose own
 * rotation is completely independent of the player's facing.
 */
export class Weapon extends Phaser.GameObjects.Container {
  private readonly barrelGroup: Phaser.GameObjects.Container;
  private recoilOffset = 0;
  private weaponType: WeaponTypeId = "bolt";
  // Sprite mode only (see AssetConfig.ts) — every weapon type shares this
  // one weapon_bolt texture (no dedicated art yet), tinted per type in
  // setWeaponType() as the cheapest available differentiator.
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  // Vector-art mode only — one pre-built shape per weapon type, toggled
  // visible/invisible in setWeaponType() rather than swapped at runtime
  // (same pattern as Enemy's pre-built limb rig). null in sprite mode.
  private readonly boltBlade: Phaser.GameObjects.Triangle | null;
  private readonly shotgunBarrel: Phaser.GameObjects.Rectangle | null;
  private readonly orbHead: Phaser.GameObjects.Arc | null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(20);

    this.barrelGroup = scene.add.container(0, 0);

    const hasSpriteAssets = (scene.registry.get(SPRITE_ASSETS_REGISTRY_KEY) as boolean | undefined) ?? false;
    if (hasSpriteAssets) {
      // Sprite-based rendering — only reachable once a real weapon_bolt
      // sheet exists (see AssetConfig.ts); this project's current
      // zero-asset state never takes this branch. Purely a presentation
      // swap: triggerFire()/recoil below are completely unchanged.
      const bolt = scene.add.sprite(WEAPON_MOUNT_DISTANCE + WEAPON_LENGTH * 0.5, 0, "weapon_bolt");
      bolt.setOrigin(0.3, 0.5);
      this.sprite = bolt;
      this.boltBlade = null;
      this.shotgunBarrel = null;
      this.orbHead = null;
      this.barrelGroup.add(bolt);
    } else {
      // Existing zero-asset vector-art rendering — the hilt is shared by
      // every weapon type; only the tip swaps per setWeaponType().
      this.sprite = null;
      const handle = scene.add.rectangle(WEAPON_MOUNT_DISTANCE, 0, WEAPON_LENGTH * 0.55, 4, COLORS.playerDead);
      handle.setOrigin(0, 0.5);

      this.boltBlade = scene.add.triangle(
        WEAPON_MOUNT_DISTANCE + WEAPON_LENGTH * 0.55,
        0,
        0,
        -4,
        WEAPON_LENGTH * 0.5,
        0,
        0,
        4,
        COLORS.playerOutline
      );

      // Shotgun — a short, wide amber barrel instead of a bladed tip.
      this.shotgunBarrel = scene.add.rectangle(
        WEAPON_MOUNT_DISTANCE + WEAPON_LENGTH * 0.45,
        0,
        WEAPON_LENGTH * 0.55,
        6,
        COLORS.pelletProjectile
      );
      this.shotgunBarrel.setOrigin(0, 0.5);
      this.shotgunBarrel.setStrokeStyle(1, COLORS.pelletProjectileGlow, 0.9);
      this.shotgunBarrel.setVisible(false);

      // Orb — a small glowing violet sphere mounted at the tip.
      this.orbHead = scene.add.circle(WEAPON_MOUNT_DISTANCE + WEAPON_LENGTH * 0.7, 0, 4, COLORS.orbProjectile);
      this.orbHead.setStrokeStyle(1, COLORS.orbProjectileGlow, 0.9);
      this.orbHead.setVisible(false);

      this.barrelGroup.add([handle, this.boltBlade, this.shotgunBarrel, this.orbHead]);
    }

    this.add(this.barrelGroup);
    scene.add.existing(this);
  }

  /**
   * Swaps the held weapon's visual identity — called from Player after
   * applying an upgrade (see UpgradeConfig's shotgunWeapon/orbWeapon).
   * Purely cosmetic: firing pattern/damage/projectile visuals live in
   * CombatSystem and Projectile.ts, driven by Player.weaponType, not by
   * anything read back from here.
   */
  setWeaponType(type: WeaponTypeId): void {
    if (this.weaponType === type) {
      return;
    }
    this.weaponType = type;

    if (this.sprite) {
      const tints: Record<WeaponTypeId, number> = {
        bolt: COLORS.projectile,
        shotgun: COLORS.pelletProjectile,
        orb: COLORS.orbProjectile,
      };
      this.sprite.setTint(tints[type]);
      return;
    }

    this.boltBlade?.setVisible(type === "bolt");
    this.shotgunBarrel?.setVisible(type === "shotgun");
    this.orbHead?.setVisible(type === "orb");
  }

  /**
   * Called every frame from Player.update(): re-anchors to the player's
   * current world position and smoothly (not instantly) swivels toward
   * (targetX, targetY) — the "smoothly swivels and points directly at
   * the cursor" requirement.
   */
  update(playerX: number, playerY: number, targetX: number, targetY: number, deltaSeconds: number): void {
    this.setPosition(playerX, playerY);

    // Angle only actually changes when the aim point differs from the
    // player's own position — Angle.Between would otherwise return 0
    // and snap the weapon to a stale/default facing.
    if (targetX !== playerX || targetY !== playerY) {
      const targetAngle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetAngle, WEAPON_SWIVEL_SPEED * deltaSeconds);
    }

    // Recoil is driven by a tween on `recoilOffset` (see triggerFire);
    // this just re-derives the barrel's local offset from it every
    // frame, so the tween and the swivel above never fight over the
    // same property.
    this.barrelGroup.x = -this.recoilOffset;
  }

  /**
   * A sharp mechanical recoil: snaps backward instantly, then eases back
   * out. Returns the muzzle tip's world position at the moment of
   * firing, for the caller to spawn the projectile and muzzle flash from.
   *
   * Deliberately computed along `fireDirection` (the actual combat
   * target — nearest enemy) rather than `this.rotation` (the cosmetic
   * cursor-aim direction the weapon model displays): the two can differ
   * a lot when the player's cursor is nowhere near the auto-fire target,
   * and a muzzle point derived from the wrong angle can start a shot far
   * enough off the player-to-target line to visibly miss a close enemy
   * even though it left the pool bound for a direct hit. Keeping the
   * bolt's origin always exactly on its own travel line avoids that
   * entirely, while the weapon model itself keeps tracking the cursor
   * purely as presentation.
   */
  triggerFire(fireDirection: Phaser.Math.Vector2): MuzzlePoint {
    this.scene.tweens.killTweensOf(this);
    this.recoilOffset = WEAPON_RECOIL_DISTANCE;
    this.scene.tweens.add({
      targets: this,
      recoilOffset: 0,
      duration: WEAPON_RECOIL_RECOVER_MS,
      ease: "Back.Out",
    });

    const distance = WEAPON_MOUNT_DISTANCE + WEAPON_LENGTH - this.recoilOffset;
    const angle = Math.atan2(fireDirection.y, fireDirection.x);
    return {
      x: this.x + Math.cos(angle) * distance,
      y: this.y + Math.sin(angle) * distance,
      angle,
    };
  }
}
