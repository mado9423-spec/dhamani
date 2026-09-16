import Phaser from "phaser";
import { DAMAGE_NUMBER_POOL_SIZE, HIT_EFFECT_POOL_SIZE } from "../config/CombatConfig";
import { DamageNumber } from "../entities/DamageNumber";
import { HitEffect } from "../entities/HitEffect";
import { ObjectPool } from "./ObjectPool";

/**
 * Owns pools for short-lived combat visual feedback (damage numbers,
 * hit bursts). Pooled (rather than plain create/destroy) so a high
 * fire rate can't create unbounded GameObjects — a burst beyond the
 * pool size just silently skips the extra visual, never gameplay.
 */
export class EffectsManager {
  private readonly damageNumbers: ObjectPool<DamageNumber>;
  private readonly hitEffects: ObjectPool<HitEffect>;

  constructor(scene: Phaser.Scene) {
    this.damageNumbers = new ObjectPool(() => new DamageNumber(scene), DAMAGE_NUMBER_POOL_SIZE);
    this.hitEffects = new ObjectPool(() => new HitEffect(scene), HIT_EFFECT_POOL_SIZE);
  }

  spawnDamageNumber(x: number, y: number, amount: number): void {
    this.damageNumbers.acquire()?.spawn(x, y, amount);
  }

  spawnHitEffect(x: number, y: number, color: number): void {
    this.hitEffects.acquire()?.spawn(x, y, color);
  }
}
