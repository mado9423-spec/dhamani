import Phaser from "phaser";
import { isBenignAudioDecodeRejection } from "./audio/AudioManager";
import { createGameConfig } from "./config/GameConfig";
import { QUALITY_PRESETS, QUALITY_REGISTRY_KEY } from "./config/QualityConfig";
import { BootScene } from "./scenes/BootScene";
import { MainScene } from "./scenes/MainScene";
import { detectDefaultQualityLevel } from "./utils/DeviceQuality";

// Global error boundary: a try/catch around game construction only
// covers synchronous config failures — a real, previously-identified
// failure mode (KeyboardInput throwing if the keyboard plugin is
// unavailable) happens asynchronously inside Scene.create(), on a later
// tick of Phaser's own boot sequence, so it would never reach that
// try/catch. These window-level listeners are the actual safety net:
// anything that goes uncaught anywhere after boot shows a plain-DOM
// fallback (independent of Phaser/canvas, see index.html) instead of a
// silent white/blank screen. This is deliberately coarse — any uncaught
// error hides the game — since a game that's silently partially broken
// is worse UX than a clear "please reload" message.
let bootFailed = false;

function showBootError(): void {
  if (bootFailed) {
    return;
  }
  bootFailed = true;

  const fallback = document.getElementById("boot-error");
  const app = document.getElementById("app");
  if (fallback) {
    fallback.style.display = "flex";
  }
  if (app) {
    app.style.display = "none";
  }
}

window.addEventListener("error", showBootError);
window.addEventListener("unhandledrejection", (event) => {
  // One specific, known-benign rejection is expected and must not be
  // fatal: attempting to load optional background music when the files
  // aren't there yet (this project's actual current, zero-asset state)
  // triggers a real browser/Phaser quirk — see
  // AudioManager.isBenignAudioDecodeRejection()'s doc comment for why —
  // and AudioManager's own cache-existence check already degrades
  // gracefully (no music, everything else unaffected) regardless of this
  // event. Everything else stays fatal, same as before.
  if (isBenignAudioDecodeRejection(event.reason)) {
    return;
  }
  showBootError();
});

document.getElementById("boot-error-reload")?.addEventListener("click", () => {
  window.location.reload();
});

let game: Phaser.Game | null = null;

try {
  const qualityLevel = detectDefaultQualityLevel();
  game = new Phaser.Game(createGameConfig([BootScene, MainScene], QUALITY_PRESETS[qualityLevel]));

  // Shared across scenes via Phaser's own registry rather than a custom
  // singleton — the idiomatic way to pass boot-time values like this.
  game.registry.set(QUALITY_REGISTRY_KEY, qualityLevel);
} catch {
  showBootError();
}

// Dev-only inspection hook (stripped from production builds, since
// import.meta.env.DEV is statically false there and the branch is
// dead-code-eliminated by the bundler).
if (import.meta.env.DEV && game) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
