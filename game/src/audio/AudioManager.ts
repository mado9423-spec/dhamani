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

/**
 * Synthesizes short SFX procedurally via the Web Audio API instead of
 * loading audio assets (none exist in this project, and none need to —
 * every sound here is a few scheduled oscillator envelopes). Reuses
 * Phaser's own already-unlocked AudioContext (via WebAudioSoundManager)
 * rather than creating a second, separately-suspended one that would need
 * its own gesture-unlock handling. Silently no-ops if Web Audio isn't
 * available in this browser — matches the project's existing safe-no-op
 * pattern for optional platform features (SaveManager, the old asset-based
 * AudioManager.play()).
 *
 * Every scheduled node is a one-shot oscillator/gain pair that stops
 * itself and is released by the browser once finished — there is nothing
 * here that persists across frames or needs explicit teardown, so this
 * class has no destroy() method and registers no scene listeners.
 */
export class AudioManager {
  private readonly context: AudioContext | null;

  constructor(scene: Phaser.Scene) {
    const sound = scene.sound;
    this.context = sound instanceof Phaser.Sound.WebAudioSoundManager ? sound.context : null;
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
