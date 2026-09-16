import Phaser from "phaser";
import { createGameConfig } from "./config/GameConfig";
import { QUALITY_PRESETS, QUALITY_REGISTRY_KEY } from "./config/QualityConfig";
import { BootScene } from "./scenes/BootScene";
import { MainScene } from "./scenes/MainScene";
import { detectDefaultQualityLevel } from "./utils/DeviceQuality";

const qualityLevel = detectDefaultQualityLevel();
const game = new Phaser.Game(createGameConfig([BootScene, MainScene], QUALITY_PRESETS[qualityLevel]));

// Shared across scenes via Phaser's own registry rather than a custom
// singleton — the idiomatic way to pass boot-time values like this.
game.registry.set(QUALITY_REGISTRY_KEY, qualityLevel);

// Dev-only inspection hook (stripped from production builds, since
// import.meta.env.DEV is statically false there and the branch is
// dead-code-eliminated by the bundler).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
