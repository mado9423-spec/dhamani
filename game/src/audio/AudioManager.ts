import Phaser from "phaser";

/**
 * Thin wrapper around Phaser's sound manager. No audio assets are
 * loaded yet in this prototype stage; play() is a no-op for unknown
 * keys so future scenes can call it safely before every sound exists.
 */
export class AudioManager {
  constructor(private readonly scene: Phaser.Scene) {}

  play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene.cache.audio.exists(key)) {
      return;
    }
    this.scene.sound.play(key, config);
  }
}
