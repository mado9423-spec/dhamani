import Phaser from "phaser";
import { createGameConfig } from "./config/GameConfig";
import { BootScene } from "./scenes/BootScene";
import { MainScene } from "./scenes/MainScene";

const game = new Phaser.Game(createGameConfig([BootScene, MainScene]));

// Dev-only inspection hook (stripped from production builds, since
// import.meta.env.DEV is statically false there and the branch is
// dead-code-eliminated by the bundler).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
