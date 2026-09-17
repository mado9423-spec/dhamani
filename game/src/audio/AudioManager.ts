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
 * Synthesizes short SFX procedurally via the Web Audio API instead of
 * loading audio assets (every one-shot sound here is a few scheduled
 * oscillator envelopes, and none need a sample). Reuses Phaser's own
 * already-unlocked AudioContext (via WebAudioSoundManager) rather than
 * creating a second, separately-suspended one that would need its own
 * gesture-unlock handling. Silently no-ops if Web Audio isn't available
 * in this browser — matches the project's existing safe-no-op pattern
 * for optional platform features (SaveManager, the sprite-asset fallback
 * in BootScene).
 *
 * Every scheduled SFX node is a one-shot oscillator/gain pair that stops
 * itself and is released by the browser once finished — nothing there
 * persists across frames or needs explicit teardown. Background music is
 * different: it's a long-lived, looping Phaser Sound instance, so unlike
 * the SFX side, this class does need an explicit destroyMusic() — see
 * MainScene's scene-shutdown handler.
 */
export class AudioManager {
  private readonly context: AudioContext | null;
  private readonly ambientTrack: Phaser.Sound.BaseSound | null;
  private readonly bossTrack: Phaser.Sound.BaseSound | null;

  constructor(scene: Phaser.Scene) {
    const sound = scene.sound;
    this.context = sound instanceof Phaser.Sound.WebAudioSoundManager ? sound.context : null;

    this.ambientTrack = AudioManager.createMusicTrack(scene, MUSIC_KEYS.ambient, AMBIENT_VOLUME);
    this.bossTrack = AudioManager.createMusicTrack(scene, MUSIC_KEYS.boss, BOSS_VOLUME);
  }

  /**
   * Queues both music tracks for loading — call from the scene's
   * preload(). Missing files never break the load: Phaser's loader keeps
   * going regardless (same as the sprite sheets in BootScene), and
   * createMusicTrack() below checks the *actual* outcome afterward via
   * `scene.cache.audio.exists()` rather than trusting a load-error event
   * — the same fix that was needed for sprite sheets applies here too
   * (a dev server can answer a missing file with a 200 of the wrong
   * content type instead of a real 404).
   */
  static preloadMusic(scene: Phaser.Scene): void {
    scene.load.audio(MUSIC_KEYS.ambient, MUSIC_PATHS.ambient);
    scene.load.audio(MUSIC_KEYS.boss, MUSIC_PATHS.boss);
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

  play(id: SfxId): void {
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
