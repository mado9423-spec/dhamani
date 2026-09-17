import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "../config/GameConfig";
import { QUALITY_PRESETS, QUALITY_REGISTRY_KEY, QualityLevel } from "../config/QualityConfig";
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
import { PauseOverlay } from "../ui/PauseOverlay";
import { UpgradeSelection } from "../ui/UpgradeSelection";
import { VictoryScreen } from "../ui/VictoryScreen";
import { readSafeAreaInsetsPx, safeAreaInsetsToGameSpace, SafeAreaInsets } from "../utils/SafeArea";

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
  private pauseOverlay!: PauseOverlay;
  private readonly worldBounds = new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  // Two independent pause flags: upgrade-selection pausing must not be
  // clearable by tapping the "resume from background" overlay, and
  // vice versa — update() halts while either is set.
  private paused = false;
  private backgroundPaused = false;
  private pendingUpgradeChoices = 0;

  // Class-field arrow functions so the exact same reference can be
  // passed to both .on() and .off() — an inline arrow at each call
  // site can't be unsubscribed later.
  private readonly handlePlayerDied = (): void => this.deathScreen.show(() => this.scene.restart());
  private readonly handlePlayerLevelUp = (): void => this.queueUpgradeChoice();
  private readonly handleGamePause = (): void => this.showBackgroundPause();
  private readonly handleGameResume = (): void => this.showBackgroundPause();
  private readonly handleScaleResize = (): void => this.applySafeArea();

  constructor() {
    super("MainScene");
  }

  create(): void {
    const qualityLevel = (this.registry.get(QUALITY_REGISTRY_KEY) as QualityLevel | undefined) ?? "medium";
    const quality = QUALITY_PRESETS[qualityLevel];
    const safeAreaInsets = this.currentSafeAreaInsets();

    new Background(this, WORLD_WIDTH, WORLD_HEIGHT);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, quality);
    this.inputManager = new InputManager(this, safeAreaInsets);
    this.hud = new HUD(this, this.player, safeAreaInsets);
    this.deathScreen = new DeathScreen(this, GAME_WIDTH, GAME_HEIGHT);
    this.announcement = new Announcement(this);
    this.bossHealthBar = new BossHealthBar(this);
    this.upgradeSelection = new UpgradeSelection(this);
    this.victoryScreen = new VictoryScreen(this, GAME_WIDTH, GAME_HEIGHT);
    this.pauseOverlay = new PauseOverlay(this);

    this.enemyManager = new EnemyManager(this);
    this.combatSystem = new CombatSystem(this, this.enemyManager, quality);
    this.nightManager = new NightManager(this.enemyManager);
    this.wireNightEvents();
    this.nightManager.start();

    this.player.on(PlayerEvents.DIED, this.handlePlayerDied);
    this.player.on(PlayerEvents.LEVEL_UP, this.handlePlayerLevelUp);

    // Phaser already auto-pauses/resumes its own update loop when the
    // tab/app is backgrounded (Core VisibilityHandler) — this just
    // adds an explicit "tap to resume" gate on top so the player isn't
    // dropped straight back into whatever was happening around them.
    this.game.events.on(Phaser.Core.Events.PAUSE, this.handleGamePause);
    this.game.events.on(Phaser.Core.Events.RESUME, this.handleGameResume);

    // Belt-and-suspenders on top of Phaser's own automatic resize/
    // orientationchange handling: re-measure safe-area insets (they
    // can change on rotation) and re-anchor the touch controls.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, this.handleScaleResize);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.player.off(PlayerEvents.DIED, this.handlePlayerDied);
      this.player.off(PlayerEvents.LEVEL_UP, this.handlePlayerLevelUp);
      this.game.events.off(Phaser.Core.Events.PAUSE, this.handleGamePause);
      this.game.events.off(Phaser.Core.Events.RESUME, this.handleGameResume);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
      this.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, this.handleScaleResize);
      this.hud.destroy();
      this.deathScreen.destroy();
      this.announcement.destroy();
      this.bossHealthBar.destroy();
      this.upgradeSelection.destroy();
      this.victoryScreen.destroy();
      this.pauseOverlay.destroy();
      this.inputManager.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.paused || this.backgroundPaused) {
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

  private currentSafeAreaInsets(): SafeAreaInsets {
    const rect = this.sys.game.canvas.getBoundingClientRect();
    return safeAreaInsetsToGameSpace(readSafeAreaInsetsPx(), rect.width, rect.height, GAME_WIDTH, GAME_HEIGHT);
  }

  private applySafeArea(): void {
    this.inputManager.updateSafeArea(this.currentSafeAreaInsets());
  }

  private showBackgroundPause(): void {
    if (this.pauseOverlay.isShowing) {
      return;
    }

    this.backgroundPaused = true;
    this.pauseOverlay.show(() => {
      this.backgroundPaused = false;
    });
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
        this.victoryScreen.show(() => this.scene.restart());
        return;
      }

      this.announcement.show(`Night ${nightNumber} Complete!`);
      this.hud.setWaveStatus(`Night ${nightNumber} · Complete`);
    });
  }
}
