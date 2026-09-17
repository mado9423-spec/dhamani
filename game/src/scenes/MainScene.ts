import Phaser from "phaser";
import { AudioManager, DANGER_PROXIMITY_RADIUS } from "../audio/AudioManager";
import { GAME_HEIGHT, GAME_WIDTH, WORLD_HEIGHT, WORLD_WIDTH, COLORS } from "../config/GameConfig";
import { NIGHTS } from "../config/NightConfig";
import { QUALITY_PRESETS, QUALITY_REGISTRY_KEY, QualityLevel, QualitySettings } from "../config/QualityConfig";
import { CAMPAIGN_COMPLETE_MARKER, DEFAULT_SAVE_DATA, SAVE_KEY, SaveData } from "../config/SaveConfig";
import { MAX_UPGRADE_LEVEL, UPGRADE_POOL, UpgradeDefinition } from "../config/UpgradeConfig";
import { Background } from "../entities/Background";
import { Player, PlayerEvents } from "../entities/Player";
import { InputManager } from "../input/InputManager";
import { SaveManager } from "../storage/SaveManager";
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
import { ScreenFX } from "../ui/ScreenFX";
import { UpgradeSelection } from "../ui/UpgradeSelection";
import { VictoryScreen } from "../ui/VictoryScreen";
import { readSafeAreaInsetsPx, safeAreaInsetsToGameSpace, SafeAreaInsets } from "../utils/SafeArea";

const UPGRADE_CHOICES_SHOWN = 3;

export class MainScene extends Phaser.Scene {
  player!: Player;
  enemyManager!: EnemyManager;
  combatSystem!: CombatSystem;
  nightManager!: NightManager;
  private background!: Background;
  private inputManager!: InputManager;
  private hud!: HUD;
  private deathScreen!: DeathScreen;
  private announcement!: Announcement;
  private bossHealthBar!: BossHealthBar;
  private upgradeSelection!: UpgradeSelection;
  private victoryScreen!: VictoryScreen;
  private pauseOverlay!: PauseOverlay;
  private audioManager!: AudioManager;
  private screenFx!: ScreenFX;
  private quality!: QualitySettings;
  private saveData: SaveData = { ...DEFAULT_SAVE_DATA };
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
  private readonly handlePlayerDied = (): void => {
    this.persistRunResult();
    this.deathScreen.show(() => this.scene.restart());
  };
  private readonly handlePlayerLevelUp = (): void => this.queueUpgradeChoice();
  private readonly handleGamePause = (): void => this.showBackgroundPause();
  private readonly handleGameResume = (): void => this.showBackgroundPause();
  private readonly handleScaleResize = (): void => this.applySafeArea();

  constructor() {
    super("MainScene");
  }

  preload(): void {
    AudioManager.preloadAudio(this);
  }

  create(): void {
    const qualityLevel = (this.registry.get(QUALITY_REGISTRY_KEY) as QualityLevel | undefined) ?? "medium";
    const quality = QUALITY_PRESETS[qualityLevel];
    this.quality = quality;
    const safeAreaInsets = this.currentSafeAreaInsets();
    this.saveData = { ...SaveManager.get<SaveData>(SAVE_KEY, DEFAULT_SAVE_DATA) };

    this.audioManager = new AudioManager(this);
    this.audioManager.playAmbient();
    this.screenFx = new ScreenFX(this);

    this.background = new Background(this, WORLD_WIDTH, WORLD_HEIGHT);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, quality, this.audioManager, this.screenFx);
    this.inputManager = new InputManager(this, safeAreaInsets);
    this.hud = new HUD(this, this.player, safeAreaInsets, this.saveData.bestNightReached);
    // DeathScreen/VictoryScreen/UpgradeSelection must all be constructed
    // (and so register their pointer listeners) before PauseOverlay — see
    // UpgradeSelection's own doc comment for why the ordering matters,
    // not just holding a reference.
    this.deathScreen = new DeathScreen(this, GAME_WIDTH, GAME_HEIGHT, () => this.pauseOverlay.isShowing);
    this.announcement = new Announcement(this);
    this.bossHealthBar = new BossHealthBar(this);
    this.upgradeSelection = new UpgradeSelection(this, () => this.pauseOverlay.isShowing);
    this.victoryScreen = new VictoryScreen(this, GAME_WIDTH, GAME_HEIGHT, this.screenFx, () => this.pauseOverlay.isShowing);
    this.pauseOverlay = new PauseOverlay(this);

    this.enemyManager = new EnemyManager(this);
    this.combatSystem = new CombatSystem(this, this.enemyManager, quality, this.audioManager, this.screenFx);
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
      this.screenFx.destroy();
      this.audioManager.destroyMusic();
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
    this.updateProximityDanger();
    this.background.cullDecor(this.cameras.main);

    const bossHealth = this.nightManager.getBossHealth();
    if (bossHealth) {
      this.bossHealthBar.update(bossHealth.health, bossHealth.maxHealth);
    }
  }

  /**
   * Counts active enemies within DANGER_PROXIMITY_RADIUS of the player and
   * hands the count to AudioManager, which owns the actual once-per-swarm
   * trigger logic (see maybePlayProximityDanger()). Lives here rather than
   * on Enemy/EnemyManager since it needs the player position plus the full
   * active-enemy set together, and EnemyManager already exposes exactly
   * that via forEachActive() without introducing an Enemy -> EnemyManager
   * import cycle.
   */
  private updateProximityDanger(): void {
    const radiusSq = DANGER_PROXIMITY_RADIUS * DANGER_PROXIMITY_RADIUS;
    let nearbyCount = 0;

    this.enemyManager.forEachActive((enemy) => {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (dx * dx + dy * dy <= radiusSq) {
        nearbyCount += 1;
      }
    });

    this.audioManager.maybePlayProximityDanger(nearbyCount);
  }

  private currentSafeAreaInsets(): SafeAreaInsets {
    const rect = this.sys.game.canvas.getBoundingClientRect();
    return safeAreaInsetsToGameSpace(readSafeAreaInsetsPx(), rect.width, rect.height, GAME_WIDTH, GAME_HEIGHT);
  }

  private applySafeArea(): void {
    const insets = this.currentSafeAreaInsets();
    this.inputManager.updateSafeArea(insets);
    this.hud.updateSafeArea(insets);
  }

  private showBackgroundPause(): void {
    // The upgrade-selection screen is already a valid, intentional paused
    // state on its own (`paused`) — layering the background-pause gate on
    // top of it would mean two independent full-screen overlays with
    // their own pointer handlers visible at once, which previously let a
    // single tap meant to dismiss "Paused" also land on a hidden upgrade
    // card underneath and silently apply it. Backgrounding/foregrounding
    // while choosing an upgrade now simply leaves that screen exactly as
    // it was — no extra gate, nothing to dismiss, nothing destroyed.
    if (this.paused || this.pauseOverlay.isShowing) {
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

    const available = UPGRADE_POOL.filter((upgrade) => this.player.upgradeLevel(upgrade.id) < MAX_UPGRADE_LEVEL);
    if (available.length === 0) {
      // Every upgrade is already maxed — nothing left to offer. Drop the
      // queued pick(s) rather than showing an empty/dead-end selection
      // screen; levelling itself still proceeds normally.
      this.pendingUpgradeChoices = 0;
      return;
    }

    this.pendingUpgradeChoices -= 1;
    this.paused = true;

    const options = Phaser.Utils.Array.Shuffle(available).slice(0, UPGRADE_CHOICES_SHOWN);
    this.upgradeSelection.show(options, (upgrade) => this.onUpgradeChosen(upgrade));
  }

  private onUpgradeChosen(upgrade: UpgradeDefinition): void {
    this.player.applyUpgrade(upgrade);
    this.audioManager.play("upgradePick");
    this.paused = false;
    this.tryShowNextUpgrade();
  }

  /** Persists the best level/coins reached this run — called on death and on victory. */
  private persistRunResult(): void {
    this.saveData.bestLevel = Math.max(this.saveData.bestLevel, this.player.level);
    this.saveData.highScoreCoins = Math.max(this.saveData.highScoreCoins, this.player.coins);
    SaveManager.set(SAVE_KEY, this.saveData);
  }

  private persistBestNight(nightNumber: number, isFinalNight: boolean): void {
    const reached = isFinalNight ? CAMPAIGN_COMPLETE_MARKER : nightNumber;
    this.saveData.bestNightReached = Math.max(this.saveData.bestNightReached, reached);
    SaveManager.set(SAVE_KEY, this.saveData);
  }

  private wireNightEvents(): void {
    this.nightManager.on(NightManagerEvents.WAVE_INTRO, ({ nightNumber, waveNumber, totalWaves }: WaveIntroPayload) => {
      this.announcement.show(`Night ${nightNumber} — Wave ${waveNumber}/${totalWaves}`);
      this.hud.setWaveStatus(`Night ${nightNumber} · Wave ${waveNumber}/${totalWaves}`);
      this.audioManager.play("waveStart");
      // Atmosphere darkens/cools progressively across the campaign: 0 at
      // Night 1, 1 by Night 7. Applied to both the camera-level
      // post-processing (ScreenFX) and the background's own floor/decor
      // tint (Background) — the two are independent, deliberately
      // redundant effects (see Background.setNightLevel's doc comment),
      // not one driving the other.
      const nightLevel = (nightNumber - 1) / (NIGHTS.length - 1);
      this.screenFx.setNightLevel(nightLevel);
      this.background.setNightLevel(nightLevel);
    });

    this.nightManager.on(NightManagerEvents.BOSS_INTRO, ({ nightNumber, isFinalNight }: BossIntroPayload) => {
      this.announcement.show(isFinalNight ? "FINAL BOSS INCOMING" : "BOSS INCOMING");
      this.hud.setWaveStatus(`Night ${nightNumber} · Boss incoming`);
    });

    this.nightManager.on(NightManagerEvents.BOSS_START, ({ nightNumber, isFinalNight }: BossStartPayload) => {
      this.hud.setWaveStatus(`Night ${nightNumber} · ${isFinalNight ? "FINAL BOSS" : "BOSS"}`);
      this.bossHealthBar.show(isFinalNight);
      this.audioManager.play("bossStart");
      this.audioManager.play("danger");
      this.audioManager.playBossMusic();
      this.screenFx.flash(COLORS.bossHealthFill, 0.18, 350);
      this.screenFx.pulseImpact(0.4, 400);
    });

    this.nightManager.on(NightManagerEvents.NIGHT_COMPLETE, ({ nightNumber, isFinalNight }: NightCompletePayload) => {
      this.bossHealthBar.hide();
      // Every NIGHT_COMPLETE follows a boss kill — always return to the
      // ambient bed here, victory included (playAmbient() is a no-op if
      // the ambient track never loaded, same as the boss track was).
      this.audioManager.playAmbient();
      this.persistBestNight(nightNumber, isFinalNight);

      // Every NIGHT_COMPLETE follows a boss kill — celebrate it at the
      // player's position (the boss is always close by at that moment),
      // converted from world space to screen space since the burst is a
      // scroll-factor-0 emitter.
      this.screenFx.burst(
        this.player.x - this.cameras.main.worldView.x,
        this.player.y - this.cameras.main.worldView.y,
        COLORS.bossHealthFill
      );
      if (this.quality.screenShakeEnabled) {
        this.cameras.main.shake(200, 0.006 * this.quality.screenShakeIntensityScale);
      }
      this.screenFx.pulseImpact(0.55, 500);

      if (isFinalNight) {
        this.persistRunResult();
        this.audioManager.play("victory");
        this.announcement.show("Victory!");
        this.hud.setWaveStatus("Campaign Complete · Victory!");
        this.victoryScreen.show(() => this.scene.restart());
        return;
      }

      this.audioManager.play("levelUp");
      this.announcement.show(`Night ${nightNumber} Complete!`);
      this.hud.setWaveStatus(`Night ${nightNumber} · Complete`);
    });
  }
}
