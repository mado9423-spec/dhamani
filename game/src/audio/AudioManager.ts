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
  | "victory";

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

// One-shot SFX real-file overrides — checked per SfxId, independent of
// each other. Every id below has a corresponding oscillator case in
// play()'s switch statement (see the bottom of this class); that code
// is the permanent fallback for whichever ids don't have a real file,
// not dead code being phased out.
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
   */
  play(id: SfxId): void {
    if (this.realSfxIds.has(id)) {
      this.scene.sound.play(sfxKey(id), { volume: SFX_FILE_VOLUME });
      return;
    }

    if (!this.context) {
      return;
    }

    switch (id) {
      case "fire":
        this.blip(760, 0.04, "square", 0.05);
        break;
      case "hit":
        this.blip(220, 0.05, "square", 0.06);
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
