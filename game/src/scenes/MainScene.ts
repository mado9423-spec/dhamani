import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "../config/GameConfig";
import { UPGRADE_POOL, UpgradeDefinition } from "../config/UpgradeConfig";
import { Background } from "../entities/Background";
import { Player, PlayerEvents } from "../entities/Player";
import { InputManager } from "../input/InputManager";
import { CombatSystem } from "../systems/CombatSystem";
import { EnemyManager } from "../systems/EnemyManager";
import {
  BossIntroPayload,
  BossStartPayload,
  NightCompletePayload,
  NightManager,
  NightManagerEvents,
  WaveIntroPayload,
} from "../systems/NightManager";
import { Announcement } from "../ui/Announcement";
import { BossHealthBar } from "../ui/BossHealthBar";
import { DeathScreen } from "../ui/DeathScreen";
import { HUD } from "../ui/HUD";
import { UpgradeSelection } from "../ui/UpgradeSelection";
import { VictoryScreen } from "../ui/VictoryScreen";

const UPGRADE_CHOICES_SHOWN = 3;

export class MainScene extends Phaser.Scene {
  player!: Player;
  enemyManager!: EnemyManager;
  combatSystem!: CombatSystem;
  nightManager!: NightManager;
  private inputManager!: InputManager;
  private hud!: HUD;
  private deathScreen!: DeathScreen;
  private announcement!: Announcement;
  private bossHealthBar!: BossHealthBar;
  private upgradeSelection!: UpgradeSelection;
  private victoryScreen!: VictoryScreen;
  private readonly worldBounds = new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  private paused = false;
  private pendingUpgradeChoices = 0;

  constructor() {
    super("MainScene");
  }

  create(): void {
    new Background(this, WORLD_WIDTH, WORLD_HEIGHT);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.inputManager = new InputManager(this);
    this.hud = new HUD(this, this.player);
    this.deathScreen = new DeathScreen(this, GAME_WIDTH, GAME_HEIGHT);
    this.announcement = new Announcement(this);
    this.bossHealthBar = new BossHealthBar(this);
    this.upgradeSelection = new UpgradeSelection(this);
    this.victoryScreen = new VictoryScreen(this, GAME_WIDTH, GAME_HEIGHT);

    this.enemyManager = new EnemyManager(this);
    this.combatSystem = new CombatSystem(this, this.enemyManager);
    this.nightManager = new NightManager(this.enemyManager);
    this.wireNightEvents();
    this.nightManager.start();

    this.player.on(PlayerEvents.DIED, () => this.deathScreen.show());
    this.player.on(PlayerEvents.LEVEL_UP, () => this.queueUpgradeChoice());

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud.destroy();
      this.deathScreen.destroy();
      this.announcement.destroy();
      this.bossHealthBar.destroy();
      this.upgradeSelection.destroy();
      this.victoryScreen.destroy();
      this.inputManager.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.paused) {
      return;
    }

    const direction = this.inputManager.getMovementVector();
    const deltaSeconds = delta / 1000;

    this.player.update(direction, deltaSeconds, this.worldBounds);
    this.enemyManager.update(deltaSeconds, this.player, this.worldBounds);
    this.combatSystem.update(deltaSeconds, this.player, this.worldBounds);
    this.nightManager.update(deltaSeconds, this.player, this.worldBounds);

    const bossHealth = this.nightManager.getBossHealth();
    if (bossHealth) {
      this.bossHealthBar.update(bossHealth.health, bossHealth.maxHealth);
    }
  }

  /** Queues an upgrade pick (levelling up multiple times at once queues one each). */
  private queueUpgradeChoice(): void {
    this.pendingUpgradeChoices += 1;
    this.tryShowNextUpgrade();
  }

  private tryShowNextUpgrade(): void {
    if (this.paused || this.pendingUpgradeChoices <= 0) {
      return;
    }

    this.pendingUpgradeChoices -= 1;
    this.paused = true;

    const options = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]).slice(0, UPGRADE_CHOICES_SHOWN);
    this.upgradeSelection.show(options, (upgrade) => this.onUpgradeChosen(upgrade));
  }

  private onUpgradeChosen(upgrade: UpgradeDefinition): void {
    this.player.applyUpgrade(upgrade.apply);
    this.paused = false;
    this.tryShowNextUpgrade();
  }

  private wireNightEvents(): void {
    this.nightManager.on(NightManagerEvents.WAVE_INTRO, ({ nightNumber, waveNumber, totalWaves }: WaveIntroPayload) => {
      this.announcement.show(`Night ${nightNumber} — Wave ${waveNumber}/${totalWaves}`);
      this.hud.setWaveStatus(`Night ${nightNumber} · Wave ${waveNumber}/${totalWaves}`);
    });

    this.nightManager.on(NightManagerEvents.BOSS_INTRO, ({ nightNumber, isFinalNight }: BossIntroPayload) => {
      this.announcement.show(isFinalNight ? "FINAL BOSS INCOMING" : "BOSS INCOMING");
      this.hud.setWaveStatus(`Night ${nightNumber} · Boss incoming`);
    });

    this.nightManager.on(NightManagerEvents.BOSS_START, ({ nightNumber, isFinalNight }: BossStartPayload) => {
      this.hud.setWaveStatus(`Night ${nightNumber} · ${isFinalNight ? "FINAL BOSS" : "BOSS"}`);
      this.bossHealthBar.show(isFinalNight);
    });

    this.nightManager.on(NightManagerEvents.NIGHT_COMPLETE, ({ nightNumber, isFinalNight }: NightCompletePayload) => {
      this.bossHealthBar.hide();

      if (isFinalNight) {
        this.announcement.show("Victory!");
        this.hud.setWaveStatus("Campaign Complete · Victory!");
        this.victoryScreen.show();
        return;
      }

      this.announcement.show(`Night ${nightNumber} Complete!`);
      this.hud.setWaveStatus(`Night ${nightNumber} · Complete`);
    });
  }
}
