# PROGRESS.md — Survive: 7 Nights

Current status snapshot. Last updated: 2026-09-17 (P0 restart fix pass).

## What exists and works (verified this session)

- **Core loop:** Player movement (keyboard + virtual joystick), auto-fire
  combat at nearest enemy in range, projectile/enemy/pickup object pooling,
  XP → level-up → 3-card upgrade selection, coin collection.
- **Content:** 3 enemy types (Walker, Fast, Tank), a per-night Boss and a
  distinct Final Boss, all 7 Nights implemented with escalating wave counts
  (10→75 enemies) and a `difficultyMultiplier` (1.0→1.9) scaling
  health/damage/rewards.
- **UI:** HUD (health/XP/level/coins/wave status), wave/boss announcement
  banners, boss health bar, death screen, victory screen, upgrade-selection
  modal — all confirmed rendering correctly in a live browser test.
- **Mobile:** Virtual joystick + fire button (touch-only devices), safe-area
  inset handling, resize/orientation handling, "tap to resume" pause on
  backgrounding, LOW/MEDIUM/HIGH quality tiers (particle pool sizes, screen
  shake, antialiasing) auto-selected from device capability.
- **Engineering quality:** TypeScript strict mode clean (zero `any`, zero
  `@ts-ignore`), `npx tsc --noEmit` and `npm run build` both pass cleanly,
  zero console/page errors during live play other than a missing favicon,
  object pooling is correctly implemented (a prior CRITICAL
  pool-exhaustion/hijack bug is confirmed fixed).

## What's missing or broken (see PROJECT_AUDIT.md for full detail)

- **~~No restart flow (P0)~~ — FIXED.** Death and Victory screens now show
  an "إعادة اللعب" (Play Again) button (`src/ui/RestartButton.ts`) that
  calls `this.scene.restart()`, giving Phaser's own scene lifecycle a
  genuinely clean reset. Verified via Playwright: die→restart→die→restart,
  and victory→restart repeated twice, all reset HP/level/XP/coins/night/wave
  to fresh-start values every time, with zero listener accumulation across
  4 consecutive restarts (game/scale/input listener counts confirmed
  constant) and zero console/page errors introduced. See
  `PROJECT_AUDIT.md`'s "P0 fix" note for the full root-cause writeup.
- **No persistence (P1).** `SaveManager` exists but is never called anywhere
  — no progress survives a reload.
- **No audio (P1).** `AudioManager` exists but is never called anywhere, and
  no audio assets exist in `public/assets/`.
- **Uncapped upgrade stacking (P1).** The 3-card upgrade pool has no
  per-run cap; long runs can drive fire-rate toward "every frame" with no
  design ceiling, and the same 3 cards repeat forever after the first pick
  of each.
- **Possible input-overlap bug (P1, logic-derived).** Backgrounding the tab
  while the upgrade-selection screen is open may let a single "tap to
  resume" also silently select a hidden upgrade card underneath it.
- **Polish gaps (P2/P3):** production source maps shipped, single 1.5 MB JS
  chunk, missing favicon (real reproducible 404 on load), no top-level error
  handling around bootstrap, no CI/`engines` field, no preload
  infrastructure, HUD doesn't re-anchor on orientation change, `ObjectPool`
  scans are O(n) (negligible at current pool sizes).

## Immediate next step

P0 (restart) is done. See `RELEASE_CHECKLIST.md` for the remaining
pre-launch checklist and `PROJECT_AUDIT.md`'s "TOP 10 PRIORITIES" for fix
order. Per instruction, only the P0 item was fixed in this pass — P1/P2
items remain open and untouched, waiting for direction.
