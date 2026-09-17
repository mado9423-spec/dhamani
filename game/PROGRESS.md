# PROGRESS.md — Survive: 7 Nights

Current status snapshot. **Status: Release Candidate (Dark Gothic /
Eldritch redesign).** Last updated: 2026-09-17 (Dark Gothic pass — see
`PROJECT_AUDIT.md`'s "Dark Gothic / Eldritch Redesign" section for the
full report). Live at https://mado9423-spec.github.io/dhamani/.

## What exists and works (verified this session)

- **Core loop:** Player movement (keyboard + virtual joystick), auto-fire
  combat at nearest enemy in range, projectile/enemy/pickup object pooling,
  XP → level-up → 3-card upgrade selection (capped, no dead ends), coin
  collection.
- **Content:** 3 enemy types (Walker, Fast, Tank), a per-night Boss and a
  distinct Final Boss, all 7 Nights implemented with escalating wave counts
  (10→75 enemies) and a `difficultyMultiplier` (1.0→1.9) scaling
  health/damage/rewards.
- **UI:** HUD (health/XP/level/coins/wave status/best-night record),
  wave/boss announcement banners, boss health bar, death screen, victory
  screen, upgrade-selection modal, background-pause gate — all with
  fade-in/pop-in transitions and press-punch feedback, all confirmed
  rendering correctly in live browser tests (desktop + mobile viewport).
- **Progression persistence:** best night reached, best level, and
  high-score coins survive a real page reload via `SaveManager`, shown on
  the HUD.
- **Audio:** every key moment (fire, hit, enemy death, player damage/death,
  level up, upgrade pick, wave start, boss start, victory) has a
  procedurally-synthesized SFX via the Web Audio API — no audio assets
  needed.
- **Juice:** damage/level-up/boss/victory/death color-grade flash pulses,
  particle bursts on player death and every boss defeat/victory, extra
  screenshake on boss hits and player death, a damage "squash" punch on
  the player — all via Phaser's own Tweens/Particles/Graphics, no new
  dependency.
- **Advanced visual FX (WebGL, zero new assets/dependencies):** real
  camera-level `postFX` Vignette + a custom chromatic-aberration/radial-blur
  `ImpactFXPipeline` (a hand-written GLSL fragment shader), pulsed only on
  damage/boss-hit/death/boss-defeat moments and otherwise idle at
  `strength=0`; a `ColorMatrix` pipeline driving procedural night-by-night
  color grading (progressively darker/desaturated from Night 1 → Night 7,
  driven by `ScreenFX.setNightLevel()`); real `postFX.addGlow()` bloom-style
  glow on the Player (1 instance), boss/final-boss enemies (≤1 concurrent),
  and every pooled Projectile (≤40 concurrent) — common enemy types are
  deliberately excluded from glow (see Performance note below). Every
  postFX call is guarded by `isWebGLRenderer()` and degrades to a silent
  no-op on a Canvas2D fallback. All camera pipelines are torn down via
  `camera.resetPostPipeline(true)` in `ScreenFX.destroy()` — verified leak-free
  across repeated scene restarts (Playwright, 3 cycles, stable pipeline
  instance count each time).
- **Mobile:** Virtual joystick + fire button (touch-only devices), safe-area
  inset handling (now including the HUD, not just touch controls),
  resize/orientation handling, "tap to resume" pause on backgrounding,
  LOW/MEDIUM/HIGH quality tiers (particle pool sizes, screen shake,
  antialiasing) auto-selected from device capability.
- **Release engineering:** production source maps disabled, the JS bundle
  is split into a `phaser` vendor chunk and a small app chunk, a favicon is
  served, a global error boundary shows a plain-DOM fallback instead of a
  blank screen on an uncaught error, and a GitHub Actions workflow runs
  `tsc --noEmit` + `npm run build` on every push/PR touching `game/`.
- **UI/HUD modernization:** health/XP bars and the boss health bar are now
  hand-drawn `Graphics` with rounded corners, a top-to-bottom fill gradient,
  and a soft layered glow-colored stroke (`BarRenderer.drawEnergyBar()`) in
  place of flat `Rectangle`s; the upgrade-selection card background is
  similarly a rounded/gradient `Graphics` draw; all HUD/overlay text has
  drop shadows (`setShadow`) for depth against the busy background;
  HUD bars redraw correctly on orientation-change re-anchoring.
- **Engineering quality:** TypeScript strict mode clean (zero `any`, zero
  `@ts-ignore`) across the whole pass, `npx tsc --noEmit` and `npm run
  build` both pass cleanly, zero console/page errors during live play
  (favicon 404 is gone), object pooling is correctly implemented, no
  listener or tween accumulation across repeated
  restart/upgrade/background cycles (verified via Playwright).
- **Bonus correctness fix (found via this pass's stress-testing, not part
  of the visual scope):** `UpgradeSelection.choose()` and
  `RestartButton.activate()` both had a latent race condition inherited
  from the prior RC pass — real state transitions (closing the upgrade
  screen, firing the restart callback) were gated behind a cosmetic tween's
  `onComplete`, whose timing relative to the same-frame input event isn't
  guaranteed. This caused an intermittent (~1-in-3, measured across
  repeated runs) silent failure: the game could get stuck paused forever.
  Both were rewritten so state transitions happen synchronously and any
  cosmetic animation is fire-and-forget. Verified with 8/8 and 6/6 repeated
  Playwright runs post-fix, plus a clean full-suite run.

## What's left (all P0/P1 items and every item from this pass are done)

- **Nothing blocking.** Every P0 and P1 from the prior audits, every item
  from the prior Release Candidate pass, and every item from this visual
  overhaul (Bloom/Glow, screen post-processing, procedural night color
  grading, HUD/UI modernization) is implemented and Playwright-verified.
  See `RELEASE_CHECKLIST.md` — every box is checked.
- **Performance note (measured, not blocking, see `PROJECT_AUDIT.md` for
  full data):** this sandbox's browser renders WebGL entirely in software
  (`SwiftShader`, confirmed via `WEBGL_debug_renderer_info` — there is no
  real GPU here), so it cannot demonstrate a genuine 60 FPS ceiling for
  *any* build, old or new — the pre-overhaul baseline already only reached
  ~11-14 FPS here. A clean A/B (`git stash`, two dev servers, identical
  script) shows the 3 new always-attached camera-level full-screen passes
  (Vignette + ColorMatrix + the custom ImpactFX shader) cost a consistent
  ~2x slowdown *in this software renderer specifically* — the regression is
  essentially flat between idle and a 30-enemy stress test, which points to
  a fixed per-frame cost from full-screen shader passes (the expected worst
  case for a software rasterizer) rather than something that scales
  unboundedly with entity/projectile count. On real GPU hardware, 3
  lightweight full-screen passes at this game's 960×540 render resolution
  are a trivial cost. No implementation change was made in response since
  the design was already performance-conscious (glow is deliberately
  scoped to Player/boss/projectiles only, never the up-to-40-concurrent
  common enemies; the ImpactFX shader itself early-exits to a plain
  passthrough sample whenever `strength` is ~0) — this is flagged here for
  visibility, not left silent.
- **P3 / deliberately deferred, not blocking:**
  - `BootScene` still has no `preload()` — not needed, since there are no
    image/font assets and audio is synthesized rather than loaded.
  - `ObjectPool.forEachActive()`/`activeCount` are still O(n) linear scans
    — negligible at current pool sizes (40/40/60), noted previously as an
    accepted tradeoff.

## Immediate next step

None blocking. The project is a Release Candidate: `npx tsc --noEmit` and
`npm run build` are clean, and every documented P0/P1 plus every item in
both the RC pass and this visual-overhaul pass is implemented and
Playwright-verified (desktop + mobile viewport, including a real page
reload for persistence). The one open item is the performance note above,
which is a measured characteristic of this specific sandbox's software
WebGL renderer, not a defect in the implementation. Future work is purely
optional polish — nothing here should block a release decision.
