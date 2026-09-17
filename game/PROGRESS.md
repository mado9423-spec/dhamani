# PROGRESS.md — Survive: 7 Nights

Current status snapshot. Last updated: 2026-09-17 (P1 background-pause/upgrade-selection fix pass).

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
- **~~Uncapped upgrade stacking (P1)~~ — FIXED.** Every upgrade (damage,
  attack speed, move speed) is now capped at `MAX_UPGRADE_LEVEL = 10` picks
  (`config/UpgradeConfig.ts`), tracked per-run in
  `PlayerStats.upgradeLevels` and enforced in `Player.applyUpgrade()` (a
  no-op once maxed). The auto-fire interval additionally has its own
  independent floor, `MIN_FIRE_INTERVAL_SECONDS = 0.1` s
  (`config/CombatConfig.ts`), enforced in `CombatSystem.fireIntervalFor()`
  regardless of `attackSpeed`'s source — guards NaN/Infinity/zero/negative,
  not just the capped case. The upgrade-selection screen now filters
  `UPGRADE_POOL` down to non-maxed upgrades before offering choices, and
  silently skips showing the screen at all if every upgrade is already
  maxed (never a 0-choice dead end). Verified via Playwright: applying each
  upgrade 20× (double the cap) leaves its level pinned at 10 and its stat
  value unchanged past that point; attack speed maxes at 9.3/sec
  (~107.5ms/shot, safely above the 100ms floor); all three stats stay
  finite and positive; a forced level-up with everything maxed does not
  pause the game or show an empty screen; restart still resets
  `upgradeLevels` back to `{0,0,0}` (confirms a related fix — the stats
  factory was changed from a shared constant to a per-Player factory so a
  nested `upgradeLevels` object can't leak between runs).
- **~~Possible input-overlap bug (P1, logic-derived)~~ — FIXED and confirmed
  reproduced pre-fix.** Backgrounding while the upgrade-selection screen
  was open previously layered PauseOverlay on top of it; since both
  registered independent global `pointerup` listeners with no mutual
  awareness, a single tap meant to dismiss "Paused" could also land on a
  hidden card and silently apply it — reproduced live via Playwright
  before fixing (a forced-visible PauseOverlay + a tap on a covered card
  incremented that upgrade's level with the card never having been seen).
  Fixed two ways: (1) `MainScene.showBackgroundPause()` now no-ops
  whenever `paused` (upgrade selection open) is already true — the
  upgrade screen is its own valid paused state, so PauseOverlay simply
  never appears over it anymore, and returning from background leaves the
  same screen exactly as it was, no extra tap needed; (2)
  `UpgradeSelection`'s pointer handlers independently defer to
  `PauseOverlay.isShowing` as a second, defense-in-depth layer, verified
  to still correctly block a card pick even when PauseOverlay is
  force-shown by test code bypassing fix (1) entirely. Verified via
  Playwright (desktop mouse) and a Pixel-7-emulated touch viewport: normal
  PLAYING background/foreground gate unaffected, upgrade selection
  survives background/foreground intact and remains genuinely clickable
  afterward, no stuck state after choosing or after restarting mid-cycle,
  and `game.events`/`scene.input` listener counts stay identical across 3
  repeated background+upgrade+restart cycles (no accumulation).
- **Polish gaps (P2/P3):** production source maps shipped, single 1.5 MB JS
  chunk, missing favicon (real reproducible 404 on load), no top-level error
  handling around bootstrap, no CI/`engines` field, no preload
  infrastructure, HUD doesn't re-anchor on orientation change, `ObjectPool`
  scans are O(n) (negligible at current pool sizes).

## Immediate next step

P0 (restart), the uncapped-upgrade-stacking P1, and the background-pause /
upgrade-selection input-conflict P1 are all done. See `RELEASE_CHECKLIST.md`
for the remaining pre-launch checklist and `PROJECT_AUDIT.md`'s
"TOP 10 PRIORITIES" for fix order. Per instruction, only that one P1 item
was fixed in this pass — the rest of P1/P2 remain open and untouched,
waiting for direction. One related, explicitly out-of-scope observation
from this pass: `DeathScreen`/`VictoryScreen`'s restart button has the same
shape of unguarded-overlap potential with `PauseOverlay` (both could be
visible together if the player dies while backgrounded), but the
consequence there is at most "restart fires a little more eagerly than
intended," not a silently corrupted stat — left untouched as it's a
different ticket.
