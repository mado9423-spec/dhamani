export type QualityLevel = "low" | "medium" | "high";

// Key used on Phaser's game-level registry (a plain DataManager, the
// idiomatic way to share a value across scenes) to pass the resolved
// quality level from boot (main.ts) into scenes.
export const QUALITY_REGISTRY_KEY = "qualityLevel";

export interface QualitySettings {
  // Particle/effects: pool sizes for purely-cosmetic hit feedback.
  // Never touches gameplay pools (enemies/projectiles/pickups).
  damageNumberPoolSize: number;
  hitEffectPoolSize: number;
  muzzleFlashPoolSize: number;
  projectileTrailPoolSize: number;

  // Screen shake on taking damage.
  screenShakeEnabled: boolean;
  screenShakeIntensityScale: number;

  // Rendering quality — applied once at Phaser.Game construction
  // (WebGL context options can't change without recreating the
  // renderer, so quality can't be hot-swapped after boot).
  antialias: boolean;
  powerPreference: "low-power" | "high-performance";
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low: {
    damageNumberPoolSize: 10,
    hitEffectPoolSize: 10,
    muzzleFlashPoolSize: 6,
    projectileTrailPoolSize: 12,
    screenShakeEnabled: false,
    screenShakeIntensityScale: 0,
    antialias: false,
    powerPreference: "low-power",
  },
  medium: {
    damageNumberPoolSize: 20,
    hitEffectPoolSize: 20,
    muzzleFlashPoolSize: 10,
    projectileTrailPoolSize: 20,
    screenShakeEnabled: true,
    screenShakeIntensityScale: 0.6,
    antialias: true,
    powerPreference: "low-power",
  },
  high: {
    damageNumberPoolSize: 30,
    hitEffectPoolSize: 30,
    muzzleFlashPoolSize: 14,
    projectileTrailPoolSize: 30,
    screenShakeEnabled: true,
    screenShakeIntensityScale: 1,
    antialias: true,
    powerPreference: "high-performance",
  },
};
