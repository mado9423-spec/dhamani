import Phaser from "phaser";

export type SfxId =
  | "fire"
  | "hit"
  | "enemyDeath"
  | "playerDamage"
  | "playerDeath"
  | "levelUp"
  | "upgradePick"
  | "waveStart"
  | "bossStart"
  | "victory"
  | "danger";

// Background music — unlike the procedural SFX below, these are real
// audio files, since a convincing ambient bed/boss theme isn't something
// worth synthesizing from oscillators. Loaded defensively (see
// preloadMusic()/createMusicTrack()): this project otherwise ships with
// zero external assets, and MainScene must keep working identically if
// these files simply aren't there.
const MUSIC_KEYS = {
  ambient: "music-ambient",
  boss: "music-boss",
} as const;

const MUSIC_PATHS = {
  ambient: "assets/audio/music/ambient.mp3",
  boss: "assets/audio/music/boss.mp3",
} as const;

const AMBIENT_VOLUME = 0.35;
const BOSS_VOLUME = 0.5;
const SFX_FILE_VOLUME = 0.5;

// Base oscillator frequencies for the two ids that get pitch
// randomization (see PITCH_VARIANT_IDS below) — pulled out of their
// blip() calls so the random factor has a fixed center to multiply.
const FIRE_BASE_FREQ = 760;
const HIT_BASE_FREQ = 220;

// ±10% random pitch on every play() — "fire" and "hit" specifically,
// since those are the two ids a normal run retriggers rapidly and
// repeatedly (auto-fire, every projectile hit), where an identical tone
// every single time reads as flat/robotic. Applies uniformly to both the
// oscillator fallback (randomizes the base frequency) and a real SFX
// file (randomizes Phaser's sound `rate` — real playback-rate pitch
// shifting isn't available for a fire-and-forget sample without extra
// DSP, and rate is the standard cheap approximation).
const PITCH_VARIANT_IDS: ReadonlySet<SfxId> = new Set(["fire", "hit"]);
const PITCH_VARIANCE = 0.1;

function randomPitchFactor(): number {
  return 1 + (Math.random() * 2 - 1) * PITCH_VARIANCE;
}

// One-shot SFX real-file overrides — checked per SfxId, independent of
// each other. Every id below has a corresponding oscillator case in
// play()'s switch statement (see the bottom of this class); that code
// is the permanent fallback for whichever ids don't have a real file,
// not dead code being phased out. "danger" is deliberately not in this
// list — it's a rare, purely-synthesized alarm cue, not something worth
// a real-file slot for.
const SFX_IDS: readonly SfxId[] = [
  "fire",
  "hit",
  "enemyDeath",
  "playerDamage",
  "playerDeath",
  "levelUp",
  "upgradePick",
  "waveStart",
  "bossStart",
  "victory",
];

function sfxKey(id: SfxId): string {
  return `sfx-${id}`;
}

function sfxPath(id: SfxId): string {
  return `assets/audio/sfx/${id}.mp3`;
}

// "Danger" trigger tuning — how close counts as "nearby" and how many
// nearby enemies counts as a swarm. Exported so the per-frame proximity
// check (MainScene.update(), via EnemyManager.forEachActive() — the
// player + full enemy list aren't something a single pooled Enemy
// instance has on its own) can share the exact same radius/threshold
// AudioManager itself reasons about in maybePlayProximityDanger()'s doc
// comment. 220px sits well above any common enemy's attackRange (33-46)
// but well inside PLAYER_FIRE_RANGE (380) — "several enemies closing in
// fast," not merely "an enemy exists somewhere on screen."
export const DANGER_PROXIMITY_RADIUS = 220;
export const DANGER_ENEMY_THRESHOLD = 5;

/**
 * True for the specific, known-benign failure this project's music
 * loading can legitimately trigger with no music files present (this
 * project's actual current state) — safe to ignore rather than treat as
 * fatal. See main.ts's `unhandledrejection` handler for where this
 * matters.
 *
 * Phaser's `AudioFile.onProcess()` calls the browser's
 * `AudioContext.decodeAudioData(buffer, onSuccess, onError)` using its
 * legacy 3-argument callback form. Phaser's own `onError` callback fires
 * correctly either way (logged as a console.error, and the file is
 * correctly left out of the audio cache — see createMusicTrack() below,
 * which checks that outcome directly rather than trusting any event).
 * But per spec, that legacy form *also* still returns a Promise for
 * backward compatibility, and since neither Phaser nor this class ever
 * holds a reference to it to attach a `.catch()`, a decode failure
 * additionally surfaces as a genuine unhandled promise rejection — a
 * `DOMException` named "EncodingError" — independent of, and in addition
 * to, Phaser's own (correct) error handling. Verified directly (Playwright,
 * capture-phase listener) against this project's real zero-asset state.
 */
export function isBenignAudioDecodeRejection(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === "EncodingError";
}

/**
 * Plays a real SFX file per SfxId when one actually loaded
 * (`public/assets/audio/sfx/<id>.mp3`), and synthesizes it procedurally
 * via the Web Audio API otherwise — this project shipped with zero
 * external assets throughout, so every one-shot sound started as a few
 * scheduled oscillator envelopes needing no sample, and that fallback
 * stays permanent, not just until real files show up. The oscillator
 * path reuses Phaser's own already-unlocked AudioContext (via
 * WebAudioSoundManager) rather than creating a second, separately-
 * suspended one that would need its own gesture-unlock handling, and
 * silently no-ops if Web Audio isn't available in this browser — matches
 * the project's existing safe-no-op pattern for optional platform
 * features (SaveManager, the sprite-asset fallback in BootScene).
 *
 * Every scheduled oscillator SFX node is a one-shot oscillator/gain pair that stops
 * itself and is released by the browser once finished — nothing there
 * persists across frames or needs explicit teardown. Background music is
 * different: it's a long-lived, looping Phaser Sound instance, so unlike
 * the SFX side, this class does need an explicit destroyMusic() — see
 * MainScene's scene-shutdown handler.
 */
export class AudioManager {
  private readonly scene: Phaser.Scene;
  private readonly context: AudioContext | null;
  private readonly ambientTrack: Phaser.Sound.BaseSound | null;
  private readonly bossTrack: Phaser.Sound.BaseSound | null;
  // Which SfxId's each have a real, successfully-loaded file — checked
  // once here (scene.cache.audio.exists() again, not a load-error event;
  // same reasoning as the music tracks above), read every play() call to
  // decide real file vs. oscillator fallback.
  private readonly realSfxIds: ReadonlySet<SfxId>;
  // Rising-edge state for the proximity "danger" trigger — see
  // maybePlayProximityDanger().
  private dangerActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const sound = scene.sound;
    this.context = sound instanceof Phaser.Sound.WebAudioSoundManager ? sound.context : null;

    this.ambientTrack = AudioManager.createMusicTrack(scene, MUSIC_KEYS.ambient, AMBIENT_VOLUME);
    this.bossTrack = AudioManager.createMusicTrack(scene, MUSIC_KEYS.boss, BOSS_VOLUME);
    this.realSfxIds = new Set(SFX_IDS.filter((id) => scene.cache.audio.exists(sfxKey(id))));
  }

  /**
   * Queues the music tracks and every one-shot SFX file for loading —
   * call from the scene's preload(). Missing files never break the
   * load: Phaser's loader keeps going regardless (same as the sprite
   * sheets in BootScene), and both createMusicTrack() and the
   * `realSfxIds` check above check the *actual* outcome afterward via
   * `scene.cache.*.exists()` rather than trusting a load-error event —
   * the same fix that was needed for sprite sheets applies here too (a
   * dev server can answer a missing file with a 200 of the wrong content
   * type instead of a real 404).
   */
  static preloadAudio(scene: Phaser.Scene): void {
    scene.load.audio(MUSIC_KEYS.ambient, MUSIC_PATHS.ambient);
    scene.load.audio(MUSIC_KEYS.boss, MUSIC_PATHS.boss);
    for (const id of SFX_IDS) {
      scene.load.audio(sfxKey(id), sfxPath(id));
    }
  }

  private static createMusicTrack(scene: Phaser.Scene, key: string, volume: number): Phaser.Sound.BaseSound | null {
    if (!scene.cache.audio.exists(key)) {
      return null;
    }

    return scene.sound.add(key, { loop: true, volume });
  }

  /** Starts the looping ambient bed (scene start, and returning from a boss fight). A no-op if the file never loaded. */
  playAmbient(): void {
    this.bossTrack?.stop();
    if (this.ambientTrack && !this.ambientTrack.isPlaying) {
      this.ambientTrack.play();
    }
  }

  /** Switches to the tenser boss theme. A no-op if the file never loaded — the ambient bed (if any) just keeps playing. */
  playBossMusic(): void {
    if (!this.bossTrack) {
      return;
    }

    this.ambientTrack?.stop();
    if (!this.bossTrack.isPlaying) {
      this.bossTrack.play();
    }
  }

  /**
   * Stops and releases both tracks. Sound instances are Game-level (they
   * outlive a scene restart on their own), so without this a
   * scene.restart() would layer a fresh pair of tracks on top of ones
   * still playing from the run that just ended — call from MainScene's
   * scene-shutdown handler, alongside its other owned systems' destroy().
   */
  destroyMusic(): void {
    this.ambientTrack?.destroy();
    this.bossTrack?.destroy();
  }

  /**
   * Call periodically (once per frame is fine — see MainScene.update(),
   * which counts nearby enemies via EnemyManager.forEachActive(); a
   * single pooled Enemy instance has no way to know how many siblings
   * are nearby on its own) with the current count of active enemies
   * within DANGER_PROXIMITY_RADIUS of the player. Plays the "danger"
   * alarm on the rising edge only — the first
   * call where the count reaches DANGER_ENEMY_THRESHOLD — then stays
   * quiet on every subsequent call while the swarm persists. Resets once
   * the count drops back below the threshold, so a later swarm can
   * trigger it again.
   */
  maybePlayProximityDanger(nearbyEnemyCount: number): void {
    const isDangerous = nearbyEnemyCount >= DANGER_ENEMY_THRESHOLD;

    if (isDangerous && !this.dangerActive) {
      this.dangerActive = true;
      this.play("danger");
    } else if (!isDangerous) {
      this.dangerActive = false;
    }
  }

  /**
   * Tries a real file first (`public/assets/audio/sfx/<id>.mp3`); if
   * that id never loaded, falls back to the existing oscillator
   * synthesis below — that code stays the permanent fallback, not dead
   * code kept temporarily. The real-file path goes through Phaser's own
   * `scene.sound.play()` (a fire-and-forget helper: it creates a
   * one-shot Sound instance, plays it, and releases it on completion),
   * not a single persistent instance — matching the oscillator path's
   * behavior of overlapping cleanly on rapid retriggers (e.g. "fire" at
   * a high attack speed) instead of one shot cutting the previous one
   * off. Unlike the oscillator fallback, this path doesn't need
   * `this.context` — Phaser's SoundManager already safely no-ops on its
   * own if Web Audio isn't available.
   *
   * "fire" and "hit" additionally get a random ±10% pitch factor every
   * call (PITCH_VARIANT_IDS) — applied to the oscillator's base
   * frequency on the fallback path, and to Phaser's `rate` playback-speed
   * config on the real-file path, so rapid repeats of either (auto-fire,
   * every projectile hit) don't sound identically flat every time.
   */
  play(id: SfxId): void {
    const pitchFactor = PITCH_VARIANT_IDS.has(id) ? randomPitchFactor() : 1;

    if (this.realSfxIds.has(id)) {
      this.scene.sound.play(sfxKey(id), { volume: SFX_FILE_VOLUME, rate: pitchFactor });
      return;
    }

    if (!this.context) {
      return;
    }

    switch (id) {
      case "fire":
        this.blip(FIRE_BASE_FREQ * pitchFactor, 0.04, "square", 0.05);
        break;
      case "hit":
        this.blip(HIT_BASE_FREQ * pitchFactor, 0.05, "square", 0.06);
        break;
      case "enemyDeath":
        this.sweep(320, 90, 0.16, "sawtooth", 0.07);
        break;
      case "playerDamage":
        this.blip(150, 0.1, "sawtooth", 0.08);
        break;
      case "playerDeath":
        this.sweep(220, 40, 0.6, "sawtooth", 0.12);
        break;
      case "levelUp":
        this.chord([523, 659, 784], 0.22, 0.06);
        break;
      case "upgradePick":
        this.sweep(440, 880, 0.14, "triangle", 0.06);
        break;
      case "waveStart":
        this.blip(392, 0.14, "triangle", 0.05);
        break;
      case "bossStart":
        this.sweep(110, 55, 0.5, "sawtooth", 0.09);
        break;
      case "victory":
        this.chord([523, 659, 784, 1047], 0.5, 0.07);
        break;
      case "danger":
        this.alarm();
        break;
    }
  }

  /** A single short tone with a quick attack/release envelope (avoids clicks). */
  private blip(freq: number, duration: number, type: OscillatorType, gain: number): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** A tone that glides from one frequency to another (hits, deaths, upgrades). */
  private sweep(fromFreq: number, toFreq: number, duration: number, type: OscillatorType, gain: number): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), now + duration);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * A two-tone alternating siren (swarm/boss "danger" cue) — distinct from
   * every other cue here: bossStart is one continuous downward sweep,
   * this is discrete high-low-high-low blips, closer to an alarm klaxon
   * than a musical sting, so it reads as urgent even layered under boss
   * music or combat SFX.
   */
  private alarm(): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    const tones = [660, 440, 660, 440];
    const toneDuration = 0.12;
    const gap = 0.14;
    tones.forEach((freq, index) => {
      const now = ctx.currentTime + index * gap;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.08, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, now + toneDuration);

      osc.connect(env).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + toneDuration + 0.02);
    });
  }

  /** Several tones together (level-up, victory) — a cheap "chime" without needing samples. */
  private chord(freqs: number[], duration: number, gain: number): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const startAt = now + index * 0.05;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startAt);

      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(gain, startAt + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(env).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    });
  }
}
