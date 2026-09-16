import Phaser from "phaser";
import { ENEMY_SPAWN_MAX_DISTANCE, ENEMY_SPAWN_MIN_DISTANCE } from "../config/CombatConfig";
import { ENEMY_TYPES } from "../config/EnemyConfig";
import { NIGHTS, PHASE_INTRO_MS, WAVE_SPAWN_INTERVAL_MS } from "../config/NightConfig";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { randomRingPoint } from "../utils/SpawnUtils";
import { EnemyManager } from "./EnemyManager";

export const NightManagerEvents = {
  WAVE_INTRO: "night-wave-intro",
  BOSS_INTRO: "night-boss-intro",
  BOSS_START: "night-boss-start",
  COMPLETE: "night-complete",
} as const;

export interface WaveIntroPayload {
  waveNumber: number;
  totalWaves: number;
}

export interface BossStartPayload {
  maxHealth: number;
}

type Phase = "wave-intro" | "wave" | "boss-intro" | "boss" | "complete";

/**
 * Drives Night 1's wave/boss progression: paces spawning up to each
 * wave's enemy count, waits for a full clear (spawned + killed) before
 * advancing, then spawns a boss once all waves are done. Placement/AI/
 * combat stay owned by EnemyManager/CombatSystem — this only decides
 * what to spawn and when.
 */
export class NightManager extends Phaser.Events.EventEmitter {
  private readonly waves = NIGHTS[0].waves;
  private waveIndex = 0;
  private remainingToSpawn = 0;
  private spawnTimer = 0;
  private phaseTimer = 0;
  private phase: Phase = "wave-intro";
  private boss: Enemy | null = null;

  constructor(private readonly enemyManager: EnemyManager) {
    super();
  }

  /**
   * Fires the first WAVE_INTRO event, so it must be called only after
   * listeners are attached (construction alone doesn't start the
   * night, precisely to avoid emitting into an empty listener list).
   */
  start(): void {
    this.beginWaveIntro();
  }

  update(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    if (player.isDead) {
      return;
    }

    switch (this.phase) {
      case "wave-intro":
        this.phaseTimer -= deltaSeconds * 1000;
        if (this.phaseTimer <= 0) {
          this.beginWave();
        }
        break;

      case "wave":
        this.updateWaveSpawning(deltaSeconds, player, worldBounds);
        if (this.remainingToSpawn <= 0 && this.enemyManager.activeCount === 0) {
          if (this.waveIndex + 1 < this.waves.length) {
            this.waveIndex += 1;
            this.beginWaveIntro();
          } else {
            this.beginBossIntro();
          }
        }
        break;

      case "boss-intro":
        this.phaseTimer -= deltaSeconds * 1000;
        if (this.phaseTimer <= 0) {
          this.beginBoss(player, worldBounds);
        }
        break;

      case "boss":
        if (this.boss && !this.boss.active) {
          this.phase = "complete";
          this.emit(NightManagerEvents.COMPLETE);
        }
        break;

      case "complete":
        break;
    }
  }

  /** Live boss health for the boss health bar UI, null outside the boss phase. */
  getBossHealth(): { health: number; maxHealth: number } | null {
    if (this.phase !== "boss" || !this.boss || !this.boss.active) {
      return null;
    }
    return { health: this.boss.health, maxHealth: this.boss.maxHealth };
  }

  private beginWaveIntro(): void {
    this.phase = "wave-intro";
    this.phaseTimer = PHASE_INTRO_MS;
    const payload: WaveIntroPayload = { waveNumber: this.waveIndex + 1, totalWaves: this.waves.length };
    this.emit(NightManagerEvents.WAVE_INTRO, payload);
  }

  private beginWave(): void {
    this.phase = "wave";
    this.remainingToSpawn = this.waves[this.waveIndex].enemyCount;
    this.spawnTimer = 0;
  }

  private beginBossIntro(): void {
    this.phase = "boss-intro";
    this.phaseTimer = PHASE_INTRO_MS;
    this.emit(NightManagerEvents.BOSS_INTRO);
  }

  private beginBoss(player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    const point = randomRingPoint(player.x, player.y, ENEMY_SPAWN_MIN_DISTANCE, ENEMY_SPAWN_MAX_DISTANCE, worldBounds);
    this.boss = this.enemyManager.spawnAt("boss", point.x, point.y);
    this.phase = "boss";

    const payload: BossStartPayload = { maxHealth: this.boss.maxHealth };
    this.emit(NightManagerEvents.BOSS_START, payload);
  }

  private updateWaveSpawning(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    if (this.remainingToSpawn <= 0) {
      return;
    }

    this.spawnTimer -= deltaSeconds * 1000;
    if (this.spawnTimer > 0) {
      return;
    }

    this.spawnTimer = WAVE_SPAWN_INTERVAL_MS;
    const type = ENEMY_TYPES[Phaser.Math.Between(0, ENEMY_TYPES.length - 1)];
    const point = randomRingPoint(player.x, player.y, ENEMY_SPAWN_MIN_DISTANCE, ENEMY_SPAWN_MAX_DISTANCE, worldBounds);
    this.enemyManager.spawnAt(type, point.x, point.y);
    this.remainingToSpawn -= 1;
  }
}
