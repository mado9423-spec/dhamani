# PROGRESS.md — Survive: 7 Nights

Current status snapshot. **Status: Release Candidate.** Last updated:
2026-09-17 (RC pass — see `PROJECT_AUDIT.md`'s "Release Candidate
Readiness" section for the full report).

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
- **Juice:** damage/level-up/boss/victory/death color-grade flash pulses, a
  permanent subtle vignette, particle bursts on player death and every
  boss defeat/victory, extra screenshake on boss hits and player death, a
  damage "squash" punch on the player — all via Phaser's own
  Tweens/Particles/Graphics, no new dependency.
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
- **Engineering quality:** TypeScript strict mode clean (zero `any`, zero
  `@ts-ignore`) across the whole pass, `npx tsc --noEmit` and `npm run
  build` both pass cleanly, zero console/page errors during live play
  (favicon 404 is gone), object pooling is correctly implemented, no
  listener or tween accumulation across repeated
  restart/upgrade/background cycles (verified via Playwright).

## What's left (all P0/P1 items and every item from this RC pass are done)

- **Nothing blocking.** Every P0 and P1 from the prior audits, and every
  item from this Release Candidate pass (SaveManager, AudioManager, source
  maps, favicon, bundle splitting, bootstrap error handling, CI, HUD
  rotation, Death/Victory screen hardening, motion/juice), is implemented
  and verified. See `RELEASE_CHECKLIST.md` — every box is checked.
- **P3 / deliberately deferred, not blocking:**
  - `BootScene` still has no `preload()` — not needed, since there are no
    image/font assets and audio is synthesized rather than loaded.
  - `ObjectPool.forEachActive()`/`activeCount` are still O(n) linear scans
    — negligible at current pool sizes (40/40/60), noted previously as an
    accepted tradeoff.
  - The vignette is a hand-drawn approximation (layered semi-transparent
    circles at each screen corner), not a true radial-gradient shader —
    Phaser's FX pipeline (`postFX.addVignette()`) only applies per
    GameObject to types implementing `PostPipeline` (Sprites/Containers),
    not the `Rectangle`/`Arc` Shape objects this project draws everything
    with, and wouldn't cover the whole screen regardless. The chosen
    approach works correctly with this project's pure-Shapes rendering and
    was visually confirmed via screenshots.

## Immediate next step

None blocking. The project is a Release Candidate: `npx tsc --noEmit` and
`npm run build` are clean, and every documented P0/P1 plus every item in
this RC pass's scope is implemented and Playwright-verified (desktop +
mobile viewport, including a real page reload for persistence). Future
work is purely optional polish (see `PROJECT_AUDIT.md`'s remaining P3
notes) — nothing here should block a release decision.
