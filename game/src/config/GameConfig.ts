import Phaser from "phaser";
import { QualitySettings } from "./QualityConfig";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// The playable world is larger than the viewport so the camera has
// room to follow the player instead of staying static.
export const WORLD_WIDTH = GAME_WIDTH * 2.5;
export const WORLD_HEIGHT = GAME_HEIGHT * 2.5;

// Dark Gothic / Eldritch Arcade palette — deliberately low-saturation,
// near-black bases with a few piercing accent colors (blood red, pale
// sickly green/bone, tarnished gold) so those accents (eyes, glow,
// sparks) read as genuinely piercing against the gloom rather than
// competing with a busy palette.
export const COLORS = {
  // Environment
  background: 0x0a0709,
  gridLine: 0x190d10,

  // Player — dark hooded wanderer
  player: 0x2a2233,
  playerOutline: 0x8f84a8,
  playerEyeGlow: 0xff3b4d,
  playerDamageFlash: 0xff3b4d,
  playerDead: 0x120e17,

  healthBarBg: 0x210a0d,
  healthBarFill: 0x9c1f2e,
  healthBarFillDark: 0x5c0f18,
  healthBarFillLow: 0xff3b4d,
  healthBarFillLowDark: 0xb81f2e,
  xpBarBg: 0x14101d,
  xpBarFill: 0x6a5a9c,
  xpBarFillDark: 0x3a2f5c,

  coin: 0xc9a44c,
  joystick: 0xcfc6e0,
  fireButton: 0xff3b4d,
  overlay: 0x000000,

  // Weaponry / projectiles — a dark energy bolt with a crimson core
  projectile: 0xff3b4d,
  projectileGlow: 0x6a1622,
  muzzleSpark: 0xff5a3d,
  smokeTrail: 0x241820,

  enemyHitFlash: 0xffffff,
  xpPickup: 0x6a5a9c,

  bossHealthFill: 0xb83280,
  bossHealthFillDark: 0x7a1f56,
  finalBossHealthFill: 0x7f1d1d,
  finalBossHealthFillDark: 0x4a1010,
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
