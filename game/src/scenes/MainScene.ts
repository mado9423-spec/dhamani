import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/GameConfig";
import { Background } from "../entities/Background";
import { Player } from "../entities/Player";
import { InputManager } from "../input/InputManager";
import { HUD } from "../ui/HUD";

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private hud!: HUD;
  private readonly bounds = new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);

  constructor() {
    super("MainScene");
  }

  create(): void {
    new Background(this, GAME_WIDTH, GAME_HEIGHT);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.inputManager = new InputManager(this);
    this.hud = new HUD(this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.destroy());
  }

  update(_time: number, delta: number): void {
    const direction = this.inputManager.getMovementVector();
    const deltaSeconds = delta / 1000;
    this.player.update(direction, deltaSeconds, this.bounds);
  }
}
