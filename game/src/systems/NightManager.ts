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
  NIGHT_COMPLETE: "night-complete",
} as const;

export interface WaveIntroPayload {
  nightNumber: number;
  waveNumber: number;
  totalWaves: number;
}

export interface BossIntroPayload {
  nightNumber: number;
  isFinalNight: boolean;
}

export interface BossStartPayload {
  nightNumber: number;
  isFinalNight: boolean;
  maxHealth: number;
}

export interface NightCompletePayload {
  nightNumber: number;
  isFinalNight: boolean;
}

type Phase = "wave-intro" | "wave" | "boss-intro" | "boss" | "campaign-complete";

/**
 * Drives the full 7-night campaign: paces spawning up to each wave's
 * enemy count, waits for a full clear (spawned + killed) before
 * advancing, then a boss once a night's waves are done. Clearing a
 * night's boss advances to the next night's wave-intro; clearing
 * Night 7's boss (the Final Boss) ends the campaign. Placement/AI/
 * combat stay owned by EnemyManager/CombatSystem — this only decides
 * what to spawn and when.
 */
export class NightManager extends Phaser.Events.EventEmitter {
  private nightIndex = 0;
  private waveIndex = 0;
  private remainingToSpawn = 0;
  private spawnTimer = 0;
  private phaseTimer = 0;
  private phase: Phase = "wave-intro";
  private boss: Enemy | null = null;
  // Reused every call instead of allocating a fresh object each frame
  // the boss health bar reads it — the caller only reads the fields
  // synchronously, never holds onto the reference.
  private readonly bossHealthSnapshot = { health: 0, maxHealth: 0 };

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
          if (this.waveIndex + 1 < this.currentNight.waves.length) {
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
          this.finishNight();
        }
        break;

      case "campaign-complete":
        break;
    }
  }

  /** Live boss health for the boss health bar UI, null outside the boss phase. */
  getBossHealth(): { health: number; maxHealth: number } | null {
    if (this.phase !== "boss" || !this.boss || !this.boss.active) {
      return null;
    }
    this.bossHealthSnapshot.health = this.boss.health;
    this.bossHealthSnapshot.maxHealth = this.boss.maxHealth;
    return this.bossHealthSnapshot;
  }

  private get currentNight() {
    return NIGHTS[this.nightIndex];
  }

  private get isFinalNight(): boolean {
    return this.nightIndex + 1 >= NIGHTS.length;
  }

  private beginWaveIntro(): void {
    this.phase = "wave-intro";
    this.phaseTimer = PHASE_INTRO_MS;
    const payload: WaveIntroPayload = {
      nightNumber: this.nightIndex + 1,
      waveNumber: this.waveIndex + 1,
      totalWaves: this.currentNight.waves.length,
    };
    this.emit(NightManagerEvents.WAVE_INTRO, payload);
  }

  private beginWave(): void {
    this.phase = "wave";
    this.remainingToSpawn = this.currentNight.waves[this.waveIndex].enemyCount;
    this.spawnTimer = 0;
  }

  private beginBossIntro(): void {
    this.phase = "boss-intro";
    this.phaseTimer = PHASE_INTRO_MS;
    const payload: BossIntroPayload = { nightNumber: this.nightIndex + 1, isFinalNight: this.isFinalNight };
    this.emit(NightManagerEvents.BOSS_INTRO, payload);
  }

  private beginBoss(player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    const point = randomRingPoint(player.x, player.y, ENEMY_SPAWN_MIN_DISTANCE, ENEMY_SPAWN_MAX_DISTANCE, worldBounds);
    const isFinalNight = this.isFinalNight;
    const bossType = isFinalNight ? "finalBoss" : "boss";

    const boss = this.enemyManager.spawnAt(bossType, point.x, point.y, this.currentNight.difficultyMultiplier);
    if (!boss) {
      // Pool momentarily full (shouldn't happen here — a wave only
      // finishes once activeCount is 0 — but stay defensive). Retry
      // shortly instead of getting stuck in boss-intro forever.
      this.phaseTimer = 250;
      return;
    }

    this.boss = boss;
    this.phase = "boss";

    const payload: BossStartPayload = { nightNumber: this.nightIndex + 1, isFinalNight, maxHealth: boss.maxHealth };
    this.emit(NightManagerEvents.BOSS_START, payload);
  }

  private finishNight(): void {
    const payload: NightCompletePayload = { nightNumber: this.nightIndex + 1, isFinalNight: this.isFinalNight };

    if (this.isFinalNight) {
      this.phase = "campaign-complete";
      this.emit(NightManagerEvents.NIGHT_COMPLETE, payload);
      return;
    }

    this.emit(NightManagerEvents.NIGHT_COMPLETE, payload);
    this.nightIndex += 1;
    this.waveIndex = 0;
    this.beginWaveIntro();
  }

  private updateWaveSpawning(deltaSeconds: number, player: Player, worldBounds: Phaser.Geom.Rectangle): void {
    if (this.remainingToSpawn <= 0) {
      return;
    }

    this.spawnTimer -= deltaSeconds * 1000;
    if (this.spawnTimer > 0) {
      return;
    }

    const type = ENEMY_TYPES[Phaser.Math.Between(0, ENEMY_TYPES.length - 1)];
    const point = randomRingPoint(player.x, player.y, ENEMY_SPAWN_MIN_DISTANCE, ENEMY_SPAWN_MAX_DISTANCE, worldBounds);
    const spawned = this.enemyManager.spawnAt(type, point.x, point.y, this.currentNight.difficultyMultiplier);

    if (!spawned) {
      // Pool at capacity: leave spawnTimer at/below zero so this is
      // retried again next frame (not another full interval away) as
      // soon as a slot frees up, instead of losing this wave enemy or
      // reusing one that's still alive.
      return;
    }

    this.spawnTimer = WAVE_SPAWN_INTERVAL_MS;
    this.remainingToSpawn -= 1;
  }
}
