# RELEASE_CHECKLIST.md — Survive: 7 Nights

Launch checklist derived from `PROJECT_AUDIT.md`. Checked items are verified
working as of the 2026-09-17 Deep Audit; unchecked items block a commercial
release.

## Blocking (must fix before any release)

- [x] **Restart/replay flow.** ~~Death and Victory screens need a working
      button/tap target that resets the run~~ — **done.** Both screens now
      show an "إعادة اللعب" button (`src/ui/RestartButton.ts`, mouse/touch/
      Enter/Space) that calls `MainScene`'s `this.scene.restart()`. Verified
      with Playwright: full HP/level/XP/coins/night/wave reset on every
      restart, across repeated death and victory cycles, with no listener
      accumulation and no new console/page errors.
- [ ] **Upgrade stacking cap.** Cap each upgrade's max stacks and/or clamp a
      minimum fire interval so late-game runs can't compound fire-rate
      toward zero.
- [ ] **Background-pause vs. upgrade-selection input overlap.** Prevent a
      "tap to resume" input from also registering as an upgrade-card pick.

## Should fix before release

- [ ] **Decide on persistence.** Either wire `SaveManager` into a real
      best-night/high-score flow, or remove the unused file.
- [ ] **Decide on audio.** Either add SFX/music assets + wire `AudioManager`
      into hit/death/levelup/upgrade events, or remove the unused file and
      scope audio explicitly as post-launch.
- [ ] **Turn off production source maps** (`vite.config.ts` `sourcemap: true`
      → `false` or `'hidden'`).
- [ ] **Add a favicon** (removes a real, reproducible 404 console error on
      every page load) and optionally a `manifest.json`.
- [ ] **Wrap game bootstrap (`main.ts`) in error handling** with a
      user-visible fallback message instead of a silent blank canvas.

## Nice to have

- [ ] Split the single 1.5 MB JS bundle (e.g. `manualChunks` for `phaser`)
      or deliberately raise/acknowledge the chunk-size warning.
- [ ] Add CI (`npm run build` on push/PR) and an `engines.node` field.
- [ ] Add `preload()` infrastructure to `BootScene` once real assets exist.
- [ ] Make `HUD` re-anchor on `applySafeArea()` the same way `InputManager`
      already does, so it doesn't sit under a notch after rotating.

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

## Re-run before shipping

```
cd game
npx tsc --noEmit
npm run build
```

Then a manual pass: start a run, take damage, level up (confirm the upgrade
modal), let a full wave clear, reach a boss, die, restart, and confirm state
is fully reset (HP, level, XP, coins, night/wave index, all pooled objects
deactivated). Repeat death→restart and victory→restart a few times in a row
to re-confirm no duplicate listeners/entities creep in.
