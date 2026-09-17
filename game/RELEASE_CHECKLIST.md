# RELEASE_CHECKLIST.md — Survive: 7 Nights

Launch checklist derived from `PROJECT_AUDIT.md`. Checked items are verified
working. **Status: Release Candidate (Dark Gothic / Eldritch redesign,
optional sprite-asset support) — every item below is done and verified;
see `PROJECT_AUDIT.md`'s "Release Candidate Readiness", "Visual Overhaul",
"Dark Gothic / Eldritch Redesign", and "Optional Sprite Assets with
Fallback" sections for the full reports.** Last updated 2026-09-17
(sprite-fallback pass). Live at https://mado9423-spec.github.io/dhamani/.
Still zero external assets by default — `public/assets/` is empty.

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

## Visual overhaul (this pass)

- [x] **Bloom & Glow.** Real `postFX.addGlow()` on Player (1 instance),
      boss/final-boss enemies (≤1 concurrent), and all pooled Projectiles
      (≤40 concurrent, `Projectile` converted `Arc`→`Container` to support
      it). Common enemy types deliberately excluded — see performance note
      below.
- [x] **Screen post-processing.** Custom `ImpactFXPipeline`
      (`src/fx/ImpactFXPipeline.ts`, hand-written GLSL chromatic-aberration
      + radial-blur) on the main camera, triggered exclusively by
      `ScreenFX.pulseImpact()` on damage/boss-hit/death/boss-defeat, idle
      passthrough (`strength=0`) otherwise.
- [x] **Procedural color grading.** Old hand-drawn corner-blob vignette
      deleted; replaced with real `camera.postFX.addVignette()` plus a
      `ColorMatrix` pipeline driving `ScreenFX.setNightLevel()` —
      progressively darker/desaturated from Night 1 → Night 7. Verified via
      Playwright reading actual `ColorMatrix.getData()` coefficients across
      all 7 nights.
- [x] **HUD/UI modernization.** `src/ui/BarRenderer.ts` (rounded-rect +
      gradient fill + glow stroke) replaces 4 flat `Rectangle` bars in
      `HUD`/`BossHealthBar`; `UpgradeSelection` card background converted
      to the same style; text shadows added across every HUD/overlay text
      element; HUD bars redraw correctly on orientation change.
- [x] **Pipeline lifecycle / no leaks.** `ScreenFX.destroy()` calls
      `camera.resetPostPipeline(true)`. Verified via Playwright: stable
      `postPipelines`/`postPipelineInstances` counts across 3 consecutive
      death→restart cycles.
- [x] **`npx tsc --noEmit` / `npm run build`** clean on the full
      visual-overhaul code.
- [x] **Performance measured and honestly reported.** This sandbox's
      browser renders WebGL in software (`SwiftShader`, no real GPU) — no
      build reaches 60 FPS here, old or new. A controlled `git stash` A/B
      shows a consistent ~2x relative slowdown from the 3 new
      always-attached camera-level full-screen passes, flat across idle vs.
      stress load (pointing to a fixed per-frame cost, not unbounded
      scaling with entity count). Not addressed with an implementation
      change since the design was already performance-conscious (glow
      scoped to low-instance entities only, shader idle early-exit); see
      `PROJECT_AUDIT.md`'s "Visual Overhaul" section for the full data and
      reasoning.
- [x] **Bonus fix (found via this pass's stress-testing):**
      `UpgradeSelection.choose()`/`RestartButton.activate()` had a latent
      ~1-in-3 race condition (state change gated behind a tween's
      `onComplete`) inherited from the prior RC pass — fixed to transition
      state synchronously. Verified 8/8 and 6/6 repeated runs post-fix.

## Dark Gothic / Eldritch redesign (this pass)

- [x] **No more spinning-arrow facing.** `MovementSystem` no longer
      rotates entities to face velocity; Player/Enemy flip `scaleX` on a
      child `visualGroup` instead, leaving the outer Container (physics)
      untouched.
- [x] **Drop shadows** under Player and every Enemy (dark `Ellipse`,
      alpha 0.6, fixed to the ground, independent of body bob/pulse).
- [x] **Layered gothic art:** hooded-wanderer Player (cloak polygon, hood,
      pulsing glowing eyes); slime-blob common enemies (asymmetric,
      out-of-sync pulsing); arachnid fast/boss/finalBoss enemies
      (4 genuinely multi-segmented, twitching limb rigs); procedural
      walking bob on all moving entities.
- [x] **Weapon.ts:** a separate top-level GameObject, smoothly swivels
      toward the cursor, sharp recoil snap + eased return, pooled
      `MuzzleFlash`/`ProjectileTrail` effects.
- [x] **Darker environment + night ColorMatrix fix.** Grimmer floor tile;
      fixed a real pre-existing bug where `ColorMatrix.brightness()`
      immediately after `.saturate()` silently discarded the brightness
      change (missing `multiply: true`); added a blood-vignette bias that
      deepens with night progress. Verified via `getData()` and
      screenshots — Night 7 is visibly, dramatically darker/redder than
      Night 1.
- [x] **Physics/visual decoupling verified.** `Enemy.radius` is a
      dedicated field set from `EnemyConfig`'s numeric radius, provably
      independent of the richer visuals. Playwright-verified exact match
      per enemy type.
- [x] **Bug found and fixed: bolt tunneling at melee range.** Spawning
      projectiles from the weapon muzzle plus the pre-existing
      fire-then-move-same-frame order let a shot skip clean over a
      melee-range enemy. Fixed by moving existing projectiles before a
      new one can fire (so it's collision-checked at the muzzle before it
      ever moves) plus a shorter muzzle reach. Verified: two clean hits
      where there were previously zero.
- [x] **`npx tsc --noEmit` / `npm run build`** clean.
- [x] **Deployed** via `npm run deploy` to the `gh-pages` branch — live at
      https://mado9423-spec.github.io/dhamani/ (new build confirmed on the
      branch and already served; `index.html` itself sits behind GitHub
      Pages' ~10-minute CDN cache).

## Optional sprite-asset support (this pass, not deployed as a visual change)

- [x] **BootScene** attempts 9 sprite sheets (`config/AssetConfig.ts`),
      defines per-sheet Phaser animations for whatever actually loads
      (`config/AnimationConfig.ts`), and sets a single `hasSpriteAssets`
      registry flag.
- [x] **Player/Enemy/Weapon/Projectile** each branch once, in their
      constructor, into a Sprite-based path or the existing zero-asset
      vector-art path (unmodified, just relocated) — never both. Hit-flash
      uses `setTintFill()`/`clearTint()` in sprite mode, same timing either
      way. `CombatSystem` triggers the player's attack clip on fire.
      `Weapon`'s recoil/cursor-swivel logic is completely untouched.
- [x] **Bug found and fixed: `hasSpriteAssets` could go stale-true.**
      Trusting the loader's `loaderror` event was fooled by Vite's dev
      server answering a missing asset with its SPA-fallback `index.html`
      (200 OK, wrong content type) instead of a 404. Fixed by checking
      `scene.textures.exists(key)` directly in `create()` — authoritative
      regardless of why a load failed. Caught and confirmed fixed via a
      real round-trip: temporary placeholder PNGs in, confirmed sprite
      mode + `fast`'s arachnid limbs both correct, PNGs removed, confirmed
      fallback mode (and the limbs) correctly returned.
- [x] **Both render paths verified**, not just one assumed from the other:
      the full existing Dark Gothic Playwright suite re-passed against the
      real (empty-assets) state; a separate suite against temporary
      placeholder PNGs confirmed every entity actually builds a Sprite,
      animations switch with movement, tint-flash/death don't throw, a
      synthetic combat drive lands a kill with a real projectile sprite in
      flight, and `enemy.radius` still matches `EnemyConfig` exactly. The
      placeholder PNGs were deleted immediately after — `public/assets/`
      still holds only `.gitkeep`, confirmed via `git status`.
- [x] **`npx tsc --noEmit` / `npm run build`** clean throughout.

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
after a death/victory to confirm the best-night record persisted. Also
confirm on a real GPU (not this sandbox's software renderer): glow on
player/projectiles/boss, the vignette + night color grading shifting
darker across nights, and the chromatic-aberration/blur pulse firing only
on damage/boss-hit/death/boss-defeat moments — and that frame rate holds
comfortably at 60 FPS on target hardware.
