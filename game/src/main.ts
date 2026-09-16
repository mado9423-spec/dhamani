import Phaser from "phaser";
import { createGameConfig } from "./config/GameConfig";
import { BootScene } from "./scenes/BootScene";
import { MainScene } from "./scenes/MainScene";

new Phaser.Game(createGameConfig([BootScene, MainScene]));
