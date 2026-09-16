import Phaser from "phaser";
import { QualitySettings } from "./QualityConfig";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// The playable world is larger than the viewport so the camera has
// room to follow the player instead of staying static.
export const WORLD_WIDTH = GAME_WIDTH * 2.5;
export const WORLD_HEIGHT = GAME_HEIGHT * 2.5;

export const COLORS = {
  background: 0x0d0f14,
  gridLine: 0x1c2130,
  player: 0x4fd1c5,
  playerOutline: 0xe6fffb,
  playerDamageFlash: 0xff4d4f,
  playerDead: 0x555b6e,
  healthBarBg: 0x2a1418,
  healthBarFill: 0x4caf50,
  healthBarFillLow: 0xff4d4f,
  xpBarBg: 0x1a1f2e,
  xpBarFill: 0x4fd1c5,
  coin: 0xffd54f,
  joystick: 0xffffff,
  fireButton: 0xff6b6b,
  overlay: 0x000000,
  projectile: 0x9ae6ff,
  enemyHitFlash: 0xffffff,
  xpPickup: 0x4fd1c5,
  bossHealthFill: 0xb83280,
  finalBossHealthFill: 0x7f1d1d,
} as const;

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
  quality: QualitySettings
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: "app",
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: {
      // Mouse/keyboard pointer + up to two simultaneous touches
      // (virtual joystick and fire button at the same time).
      activePointers: 3,
    },
    // WebGL context options only take effect at construction time —
    // quality can't be hot-swapped without recreating the renderer.
    antialias: quality.antialias,
    antialiasGL: quality.antialias,
    render: {
      powerPreference: quality.powerPreference,
    },
    scene: scenes,
  };
}
