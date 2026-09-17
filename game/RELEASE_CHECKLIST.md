# RELEASE_CHECKLIST.md — Survive: 7 Nights

Launch checklist derived from `PROJECT_AUDIT.md`. Checked items are verified
working. **Status: Release Candidate — every item below is done and
verified; see `PROJECT_AUDIT.md`'s "Release Candidate Readiness" section
for the full report.** Last updated 2026-09-17 (RC pass).

## Blocking (must fix before any release)

- [x] **Restart/replay flow.** ~~Death and Victory screens need a working
      button/tap target that resets the run~~ — **done.** Both screens now
      show an "إعادة اللعب" button (`src/ui/RestartButton.ts`, mouse/touch/
      Enter/Space) that calls `MainScene`'s `this.scene.restart()`. Verified
      with Playwright: full HP/level/XP/coins/night/wave reset on every
      restart, across repeated death and victory cycles, with no listener
      accumulation and no new console/page errors.
- [x] **Upgrade stacking cap.** ~~Cap each upgrade's max stacks and/or clamp
      a minimum fire interval~~ — **done.** Every upgrade is capped at
      `MAX_UPGRADE_LEVEL = 10` picks (`config/UpgradeConfig.ts`), and the
      auto-fire interval independently can't go below
      `MIN_FIRE_INTERVAL_SECONDS = 0.1s` (`config/CombatConfig.ts`,
      enforced in `CombatSystem`) regardless of source. Upgrade-selection
      screen skips maxed upgrades and never shows an empty/dead-end screen.
      Verified with Playwright at 20× over-application per upgrade — see
      `PROJECT_AUDIT.md`'s P1 fix note.
- [x] **Background-pause vs. upgrade-selection input overlap.** ~~Prevent a
      "tap to resume" input from also registering as an upgrade-card
      pick~~ — **done.** Reproduced the ghost-input bug live before fixing
      (a tap dismissing a force-shown PauseOverlay also silently applied
      the hidden card underneath it). Fixed by having
      `showBackgroundPause()` no-op while an upgrade choice is pending
      (`MainScene.ts`) so the two overlays no longer stack in the first
      place, plus a defensive `PauseOverlay.isShowing` check inside
      `UpgradeSelection`'s own pointer handlers (`UpgradeSelection.ts`) as
      a second layer. Verified with Playwright on desktop mouse and a
      Pixel-7 touch viewport; see `PROJECT_AUDIT.md`'s P1 fix note.

## Should fix before release

- [x] **Persistence activated.** `SaveManager` now backs a real
      best-night/best-level/high-score-coins record (`config/SaveConfig.ts`,
      loaded/saved from `MainScene`), shown on the HUD as "Best: Night N" /
      "Best: Campaign Complete!". Verified to survive a real page reload
      (not just a scene restart).
- [x] **Audio activated.** `AudioManager` now synthesizes every SFX
      procedurally via the Web Audio API (fire, hit, enemy death, player
      damage/death, level up, upgrade pick, wave start, boss start,
      victory) — no audio assets needed or added. Reuses Phaser's own
      already-unlocked `AudioContext`; silently no-ops if Web Audio is
      unavailable.
- [x] **Production source maps disabled** (`vite.config.ts`
      `sourcemap: false`). Confirmed via a fresh build: zero `.map` files
      in `dist/`.
- [x] **Favicon added** (`public/favicon.svg`, linked in `index.html`).
      Confirmed via Playwright: `GET /favicon.svg` → 200, and the
      previously-reproducible favicon 404 console error is gone.
- [x] **Bootstrap error handling added.** `main.ts` wraps game construction
      in try/catch *and* installs `window` `error`/`unhandledrejection`
      listeners (needed because the one previously-identified real failure
      — `KeyboardInput` throwing — happens asynchronously inside
      `Scene.create()`, a tick a synchronous try/catch can't reach). Shows
      a plain-DOM fallback (`#boot-error` in `index.html`, independent of
      Phaser/canvas) with a Reload button instead of a blank screen.

## Nice to have

- [x] **Bundle split.** `manualChunks: { phaser: ["phaser"] }` separates
      the ~1.48 MB Phaser engine from the ~50 KB app code — confirmed via a
      fresh build (`phaser-*.js` vs. `index-*.js` as two chunks). App-code
      redeploys no longer force a re-download of the engine chunk.
- [x] **CI added** (`.github/workflows/game-ci.yml` at the repo root, since
      GitHub only discovers workflows there — scoped to this project via a
      `paths: ["game/**"]` trigger filter and `working-directory: game` on
      every step, so it cannot affect or interact with the unrelated app at
      the repo root). Runs `npm ci`, `npx tsc --noEmit`, `npm run build` on
      push/PR. `engines.node` also added to `package.json`.
- [x] **HUD re-anchors on orientation change.** Added
      `HUD.updateSafeArea()`, called from `MainScene.applySafeArea()`
      alongside `InputManager`'s existing call.
- [ ] Add `preload()` infrastructure to `BootScene` once real image/font
      assets exist (still not needed today — audio no longer needs it
      either, since it's synthesized, not loaded).

## Release Candidate polish (this pass)

- [x] **Screens defense-in-depth.** `DeathScreen`/`VictoryScreen`'s
      `RestartButton` now defers to `PauseOverlay.isShowing` the same way
      `UpgradeSelection` already did, closing the same class of
      ghost-input risk there too.
- [x] **Motion & juice.** Fade-in/pop-in transitions on every overlay
      (Pause, Upgrade Selection, Death, Victory), staggered upgrade-card
      entrance, press-punch feedback on every button/card, a damage
      "squash" punch on the player, particle bursts on player death and on
      every boss defeat/victory, extra screenshake on boss hits/player
      death/boss defeats, short color-grade flash pulses (damage, level
      up, boss incoming, death, victory), and a permanent subtle corner
      vignette — all via Phaser's own Tweens/Particles/Graphics (no new
      npm dependency). See `PROJECT_AUDIT.md` for the full list and the
      technical reasoning behind each implementation choice.

## Verified working (re-confirm after any of the above changes)

- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [x] No uncaught exceptions during live play (movement, combat, spawning,
      leveling, death)
- [x] Object pooling correct (no pool-exhaustion hijack — prior CRITICAL bug
      confirmed fixed)
- [x] All 7 Nights + Final Boss reachable via the wave/night state machine
- [x] Mobile touch controls (joystick + fire button), safe-area insets,
      resize/orientation handling, tap-to-resume backgrounding pause
- [x] Quality tiers (LOW/MEDIUM/HIGH) auto-selected from device capability,
      scoped to cosmetics only (gameplay values untouched)
- [x] Upgrade stacking capped at 10 per upgrade; fire interval floored at
      0.1s independent of the cap; no dead-end upgrade screen when maxed
- [x] Background pause and upgrade selection no longer conflict: no
      layered overlays, no ghost-applied upgrades, no stuck state, no
      listener accumulation across repeated cycles (desktop + touch)
- [x] SaveManager persistence survives a real page reload (not just a
      scene restart); HUD reflects it correctly on the very next load
- [x] AudioManager plays every SFX with no console/page errors; gracefully
      silent if Web Audio is unavailable
- [x] No source maps in `dist/`; favicon served with 200; bundle correctly
      split into a `phaser` vendor chunk and an app chunk
- [x] Active-tween count returns to a small, stable baseline after
      repeated restart/upgrade/background cycles (no tween accumulation)
- [x] `window` `error`/`unhandledrejection` listeners installed; the
      `#boot-error` fallback exists in the DOM and is hidden by default

## Re-run before shipping

```
cd game
npx tsc --noEmit
npm run build
```

Then a manual pass: start a run, take damage, level up (confirm the upgrade
modal, its juice, and the sounds), let a full wave clear, reach a boss
(confirm the flash/audio), die (confirm the particle burst and sound),
restart, and confirm state is fully reset (HP, level, XP, coins, night/wave
index, all pooled objects deactivated, best-night display on the HUD).
Repeat death→restart and victory→restart a few times in a row to
re-confirm no duplicate listeners/tweens/entities creep in. Reload the page
after a death/victory to confirm the best-night record persisted.
