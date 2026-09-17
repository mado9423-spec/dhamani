# PROJECT_AUDIT.md — Survive: 7 Nights

Deep audit performed as Senior Game Engineer + Release Engineer. Every file in
`game/src/` was read in full during this pass (not just filenames/structure),
`npx tsc --noEmit` and `npm run build` were run fresh, the dev server was
booted and driven with a real Chromium browser via Playwright (page load,
console/page-error capture, movement, combat, forced death, restart attempts,
screenshot evidence), and `package-lock.json` was inspected for dependency
duplication. No assumptions were carried over from prior sessions — every
claim below is backed by a file:line citation, a command's real output, or a
live browser observation captured during this audit.

Scope: `game/` subdirectory only. The repository root (`dhamani`) is an
unrelated production app ("ضماني") and was not touched.

Date of this audit: 2026-09-17.

---

## Status update (2026-09-17, follow-up pass)

**P0-1 (no restart flow) is fixed.** `src/ui/RestartButton.ts` is a new
shared, tappable "إعادة اللعب" control (mouse, touch, and Enter/Space),
used by both `DeathScreen.show(onRestart)` and `VictoryScreen.show(onRestart)`.
`MainScene` wires both to `() => this.scene.restart()`, letting Phaser's own
scene shutdown/create cycle do the reset — its `DisplayList`/`UpdateList`/
`Clock`/`TweenManager`/`InputPlugin` all auto-destroy or auto-clear
everything scene-scoped on `SHUTDOWN` (confirmed by reading Phaser's own
source this pass), and `MainScene`'s existing manual cleanup already
correctly removed the two listener types Phaser does *not* auto-clean
(`game.events` and `scale`, both Game-global, not scene-scoped) — so no
further manual teardown code was needed. Verified via Playwright: repeated
death→restart and victory→restart cycles all produce a fully fresh session
(HP/level/XP/coins/night/wave reset), with `game.events`/`scale`/
`scene.input` listener counts confirmed identical before and after 4
consecutive restarts (no accumulation), and zero new console/page errors.
Full write-up of the root cause and fix in the P0-1 entry below (left
otherwise unchanged from the original audit for the record) and in the
commit that applied it. **All P1/P2/P3 findings below remain open and
untouched** — only P0-1 was in scope for this pass.

---

## Status update (2026-09-17, second follow-up pass)

**P1-3 (uncapped upgrade stacking) is fixed.** Investigated the exact
existing formulas before choosing limits (not invented blindly): `damage`
×1.2/pick, `attackSpeed` ×1.25/pick, `speed` ×1.15/pick
(`config/UpgradeConfig.ts`), with `attackSpeed` read by `CombatSystem` as
"attacks per second" and converted to a per-shot interval via
`fireTimer = 1 / attackSpeed` seconds (`systems/CombatSystem.ts`) — the
uncapped division that could approach zero.

Fix, two independent layers:
1. **Per-upgrade level cap.** `PlayerStats` gained
   `upgradeLevels: Record<UpgradeId, number>` (`config/PlayerConfig.ts`),
   incremented and checked in `Player.applyUpgrade()`
   (`entities/Player.ts`) against a new `MAX_UPGRADE_LEVEL = 10`
   (`config/UpgradeConfig.ts`) — chosen from the existing formulas, not a
   round number picked blindly: at 10 stacks damage reaches 1.2¹⁰≈6.2×
   (10→62.2), move speed 1.15¹⁰≈4.0× (260→1051), and attack speed
   1.25¹⁰≈9.3/sec (~107.5ms/shot) — strong late-game power without an
   unbounded curve, and already safely above the interval floor below
   without needing it. Reaching the cap is a real no-op: the level counter
   stops, `apply()` is never called again, so the stat itself stops too.
2. **Independent fire-interval floor.** `MIN_FIRE_INTERVAL_SECONDS = 0.1`
   (`config/CombatConfig.ts`) is enforced in a new
   `CombatSystem.fireIntervalFor()` static helper — `Math.max(floor, 1 /
   attackSpeed)`, with an explicit `Number.isFinite`/`<= 0` guard first so
   a zero, negative, or NaN `attackSpeed` can never produce a NaN/Infinity
   `fireTimer` (which would otherwise bypass the `fireTimer > 0` guard
   entirely, since NaN comparisons are always false, and fire every
   frame). This floor is independent of the level cap — it holds even if
   `attackSpeed` were ever pushed past 10/sec by some future change.

`UpgradeSelection.tryShowNextUpgrade()` (`scenes/MainScene.ts`) now filters
`UPGRADE_POOL` to non-maxed upgrades before offering a choice, and drops
the queued pick without showing the screen if every upgrade is already
maxed — never a 0-choice dead end, and `UpgradeSelection.ts` itself needed
no changes (dynamic card count already handled correctly).

One related correctness fix was required to do this safely:
`DEFAULT_PLAYER_STATS` was a shared module-level constant object spread
(`{ ...DEFAULT_PLAYER_STATS }`) into each new `Player`; adding a nested
`upgradeLevels` object to it would have been shared-by-reference across
every Player instance and every restart (mutating one run's levels would
have corrupted the next run's starting state). Changed to a
`createDefaultPlayerStats()` factory returning a fresh object (including a
fresh `upgradeLevels`) every call — confirmed via Playwright that a
restart after maxing all three upgrades correctly comes back with
`upgradeLevels: {damage:0, attackSpeed:0, moveSpeed:0}`.

Verified via Playwright: a real UI upgrade pick still works end-to-end
(screenshot confirmed); each upgrade applied 20× (double the cap)
programmatically pins its level at exactly 10 and its stat value stops
changing past that point; attack speed's resulting fire interval
(0.1075s) sits safely above the 0.1s floor; all three stats stay finite
and positive after over-application; a forced level-up with everything
maxed does not pause the game or show an empty upgrade screen; restart
still fully resets levels and stats; movement/combat/enemy-spawn/wave
progression all still function after the maxed state and after a
subsequent restart. `npx tsc --noEmit` and `npm run build` both stay
clean, zero `any`/`@ts-ignore` introduced.

**All other P1/P2/P3 findings below remain open and untouched** — only
P1-3 was in scope for this pass.

---

## 1. Project Discovery (verified facts, not assumptions)

- Stack: Phaser **3.90.0** installed (declared `^3.80.1`), TypeScript
  **5.9.3** installed (declared `^5.5.3`), Vite **5.4.21** installed
  (declared `^5.4.0`) — confirmed via `npm ls phaser typescript vite`.
- `package.json`: single dependency (`phaser`), two devDependencies
  (`typescript`, `vite`). No test framework, no lint config, no CI.
- 46 TypeScript modules under `src/`, organized into
  `config/entities/scenes/systems/input/ui/audio/storage/utils`.
- `public/assets/` contains **only** `.gitkeep` — zero art/audio assets exist.
- No favicon, no `manifest.json`, no `.github/workflows`.

## 2. Architecture Map (traced, not guessed)

```
main.ts → new Phaser.Game(createGameConfig([BootScene, MainScene], quality))
  BootScene.create() → scene.start("MainScene")
  MainScene.create()
    → Player, InputManager, HUD, DeathScreen, Announcement, BossHealthBar,
      UpgradeSelection, VictoryScreen, PauseOverlay
    → EnemyManager, CombatSystem(→ ProjectileManager, PickupManager,
      EffectsManager), NightManager
    → wireNightEvents(); nightManager.start()
  MainScene.update() → player.update → enemyManager.update →
      combatSystem.update → nightManager.update → bossHealthBar.update
```

All gameplay state lives inside `MainScene` and the systems it owns; there is
no global registry usage beyond the one-time `qualityLevel` value set in
`main.ts`. This is a clean, traceable architecture with no hidden coupling.

## 3. Build & Type-Check Audit — fresh results

```
$ npx tsc --noEmit         → exit 0, zero errors
$ npm run build             → exit 0
  dist/assets/index-*.js   1,517.01 kB │ gzip: 350.14 kB │ map: 10,308.60 kB
  (!) Rollup chunk-size warning: some chunks are larger than 500 kB
```

Build is clean. No hidden failures, no suppressed errors.

Grep audit across all of `src/` for `any`, `as any`, `@ts-ignore`,
`@ts-nocheck`, `@ts-expect-error`: **zero matches**. `strict: true`,
`noUnusedLocals`, `noUnusedParameters` are all on and the codebase is clean
against them. This part of the codebase is genuinely solid.

## 4. Dependency Audit

- `package-lock.json`: 61 unique resolved packages, **zero** packages with
  more than one version present (no duplication).
- Only import used anywhere in `src/` besides relative imports is `"phaser"`
  — confirmed via `grep -rh "^import" src`. No unused dependency, no
  duplicate dependency.
- Caret-range drift: installed versions are newer than declared floors
  (phaser 3.90.0 vs `^3.80.1`, typescript 5.9.3 vs `^5.5.3`, vite 5.4.21 vs
  `^5.4.0`). Not currently causing any build/type error, but means a fresh
  `npm install` today would not reproduce the exact versions this was last
  verified against — no lockfile problem, just worth knowing.
- No `engines` field in `package.json`, no CI workflow — nothing currently
  prevents a broken build from being merged undetected.

## 5. Browser QA (live, this session)

Ran the real dev server (`vite`) and drove it with Chromium via Playwright:

- Page load: succeeds, `window.__game` dev hook present, no `pageerror`
  events (zero uncaught exceptions).
- One real console error captured: `Failed to load resource: 404` —
  independently confirmed via `curl -o /dev/null -w '%{http_code}' /favicon.ico`
  → `404`. No `<link rel="icon">` in `index.html`, no favicon file in
  `public/`.
- Movement (WASD), automatic enemy spawning, and combat all function:
  after 4s of play, HUD/state read back via `window.__game` showed
  `enemiesActive: 4`, player HP unchanged, night/wave index progressing
  correctly (`Night 1 · Wave 1/3`).
- Forced player death (`player.takeDamage(999999)`) → `isDead: true`,
  `DeathScreen.show()` fires, **"You Died"** renders correctly.
- Pressed Space, pressed Enter, clicked the center of the screen — **none of
  these had any effect**. `isDead` stayed `true`, HP stayed `0`, the scene
  never restarted. Screenshot evidence captured, confirming a completely
  static end screen with no button, no prompt, no way forward.

## 6. Findings — Classified P0–P3

Each finding: **Problem / File / Cause / Impact / Evidence / Fix / Severity /
Mobile? / Performance? / Gameplay?**

---

### P0-1 — No restart/continue flow after death or victory
- **File:** `src/ui/DeathScreen.ts`, `src/ui/VictoryScreen.ts`,
  `src/scenes/MainScene.ts`
- **Cause:** `DeathScreen` and `VictoryScreen` are pure display overlays —
  reading their full source confirms they contain only a `Rectangle` and
  `Text` objects, no `.setInteractive()`, no buttons, no callbacks. Grepping
  the entire `src/` tree for `scene.restart` / `scene.scene.start` /
  `location.reload` returns zero matches — no code path anywhere ever
  restarts the scene or game.
- **Impact:** Every single playthrough, win or lose, ends in a permanent
  dead end. The only way to play again is to reload the browser tab, which
  forfeits everything (see P1-2, no persistence).
- **Evidence:** Live Playwright test this session — after forcing death,
  Space/Enter/click were tried; `isDead` remained `true`, HP remained `0`,
  the scene stayed active but frozen. Screenshot confirms only static
  "You Died" text with no interactive control anywhere on screen.
- **Fix:** Add a "Restart" (and "Continue"/"Main Menu") interactive control
  to both overlays, reusing the same global-pointer-event + manual
  `Rectangle.Contains` hit-testing pattern already proven in
  `VirtualJoystick`/`FireButton`/`UpgradeSelection`. On press, call
  `this.scene.scene.restart()` (or re-run scene setup) to fully reset state.
- **Severity:** P0 — blocks any real release; the core game loop cannot
  loop.
- **Mobile:** Yes (identical dead end on touch — no tap target exists at all).
- **Performance:** No.
- **Gameplay:** Yes — this is the single highest-impact gameplay defect in
  the project.

---

### P1-1 — Zero save/load persistence (SaveManager is fully dead code)
- **File:** `src/storage/SaveManager.ts`
- **Cause:** `SaveManager.get/set/remove` are correctly implemented
  (try/catch around `localStorage`, typed, prefixed keys) but have **zero
  call sites** anywhere in the codebase — confirmed by reading every other
  file in `src/` during this audit; nothing imports `SaveManager`.
- **Impact:** No best night/level/coins survive a reload. Combined with
  P0-1, a finished or lost run is completely unrecoverable in-session.
- **Evidence:** Full-project read, zero `import.*SaveManager` matches.
- **Fix:** Either wire it in (persist best night reached / high score /
  quality setting) before release, or remove the dead file if persistence is
  explicitly out of scope — leaving an unused, untested storage layer in a
  "commercial" build is a release-readiness gap either way.
- **Severity:** P1.
- **Mobile:** No specific mobile impact beyond the general one.
- **Performance:** No.
- **Gameplay:** Yes (progression permanence).

---

### P1-2 — Zero audio (AudioManager is fully dead code, no assets exist)
- **File:** `src/audio/AudioManager.ts`, `public/assets/`
- **Cause:** `AudioManager.play()` is implemented and correctly no-ops when
  `!scene.cache.audio.exists(key)`, but has **zero call sites** anywhere in
  `src/` — confirmed by reading every scene/entity/system file. No audio
  files exist in `public/assets/` (only `.gitkeep`), and `BootScene` has no
  `preload()` to load any.
- **Impact:** The game is 100% silent — no hit sounds, no music, no UI
  feedback sounds. For a game being evaluated for commercial release this is
  a major completeness gap, not a defect in the code that exists.
- **Evidence:** Directory listing + full-project import grep, both zero
  results.
- **Fix:** Either scope audio into the release plan (assets + `preload()` +
  wiring `AudioManager.play()` into hit/death/levelup/upgrade events) or
  explicitly document it as post-launch scope. Leaving a dead, never-invoked
  class in the codebase is itself a smell worth resolving either way.
- **Severity:** P1 (completeness, not correctness).
- **Mobile:** No specific extra impact.
- **Performance:** No.
- **Gameplay:** No (cosmetic/feedback only), but UX-significant.

---

### P1-3 — Uncapped upgrade stacking degrades late-game balance and fire-rate sanity
- **File:** `src/config/UpgradeConfig.ts`, `src/entities/Player.ts:169-171`
  (`applyUpgrade`), `src/scenes/MainScene.ts:168-178`
  (`tryShowNextUpgrade`), `src/systems/CombatSystem.ts:58`
- **Cause:** `UPGRADE_POOL` has exactly 3 entries and `applyUpgrade()`
  multiplies the target stat every single time with **no cap and no
  per-upgrade exclusion**. `tryShowNextUpgrade()` reshuffles the same
  3-entry pool on every level-up forever, so after the first 3 picks a
  player is offered — and can keep re-picking — the identical 3 cards
  indefinitely. `CombatSystem.update`'s `this.fireTimer = 1 / player.attackSpeed`
  has no floor/minimum, and `attackSpeed` compounds ×1.25 per pick with no
  ceiling.
- **Impact:** In a long run (the XP curve in `PlayerConfig.ts` only grows
  20 XP × 1.25^level, and Night 7's biggest wave alone contains 75 kills'
  worth of XP), `attackSpeed` can compound into double digits, driving the
  fire interval toward zero — i.e. firing on effectively every frame. This
  is not a crash (the pool-exhaustion fix from a prior session makes
  `acquire()` return `null` safely), but it is a real, reachable balance
  breakdown: unlimited DPS scaling with no design ceiling, and a
  progression system that runs out of content variety after 3 picks.
- **Evidence:** Direct source read of all three files; the multiplier chain
  and lack of any `Math.max`/clamp on `fireTimer` or on any upgraded stat is
  unambiguous in the code.
- **Fix:** Either cap each upgrade's total stack count (e.g. track picks per
  `UpgradeId` and exclude/gray-out once maxed), add a minimum fire interval
  clamp (`Math.max(MIN_FIRE_INTERVAL, 1 / player.attackSpeed)`), or expand
  `UPGRADE_POOL` with more variety so a long run doesn't degenerate into
  re-picking the same 3 cards.
- **Severity:** P1 (balance-breaking, reachable in a normal 7-night run, not
  an edge case).
- **Mobile:** No specific extra impact.
- **Performance:** Indirect — more frequent firing means more
  projectile-pool churn and more collision checks per frame at high levels.
- **Gameplay:** Yes.

---

### P1-4 — Possible ghost-input: backgrounding mid-upgrade-choice can silently pick a card
- **File:** `src/scenes/MainScene.ts:151-160` (`showBackgroundPause`),
  `src/ui/PauseOverlay.ts`, `src/ui/UpgradeSelection.ts`
- **Cause:** `paused` (upgrade selection open) and `backgroundPaused`
  (tab was hidden) are tracked as two independent flags by design (see the
  comment at `MainScene.ts:43-45`). `showBackgroundPause()` shows the
  `PauseOverlay` (depth 5000/5001, opacity 0.8) regardless of whether
  `UpgradeSelection` is currently active (depth 4000/4001) — it only guards
  against re-showing itself (`if (this.pauseOverlay.isShowing) return;`).
  Both `PauseOverlay.handlePointerUp` and `UpgradeSelection.handlePointerUp`
  are independent global `scene.input.on(POINTER_UP, ...)` listeners with no
  cross-awareness or `stopPropagation`; both fire on the same tap event.
  `UpgradeSelection.handlePointerUp` only checks its own `this.active` flag,
  not whether something else (the pause overlay) is visually on top of it.
- **Impact:** If a player backgrounds the tab while the upgrade-selection
  screen is open, the returning "tap to resume" tap lands in the same
  screen region where the upgrade cards are (the pause overlay visually
  hides them, but doesn't consume the input). A single tap intended only to
  dismiss "Paused" can simultaneously and invisibly select whichever
  upgrade card is underneath the tap coordinates.
- **Evidence:** Static code read of both handlers and the depth/z-order
  values; this combination was not reproduced live in this audit (tab
  backgrounding via `document.visibilitychange` is not reliably simulatable
  through the CDP session used here), so this is reported as a
  logic-derived, high-confidence finding rather than an observed crash.
- **Fix:** Have `UpgradeSelection.handlePointerUp` early-return whenever
  `PauseOverlay.isShowing` is true (needs a getter/reference), or have
  `showBackgroundPause()` temporarily disable `UpgradeSelection`'s pointer
  listener while the background-pause overlay is up.
- **Severity:** P1 (silent incorrect state mutation, plausible in normal
  mobile use — backgrounding the tab mid-level-up is an everyday scenario).
- **Mobile:** Yes — backgrounding is far more common on mobile (app switch,
  notification, lock screen) than desktop.
- **Performance:** No.
- **Gameplay:** Yes.

---

### P2-1 — Source maps shipped in production build
- **File:** `vite.config.ts:10` (`build: { outDir: "dist", sourcemap: true }`)
- **Cause:** `sourcemap: true` is unconditional, not gated by build mode.
- **Impact:** Fresh `npm run build` this session emitted a **10.3 MB**
  `.js.map` file alongside the 1.5 MB JS bundle — shipping full source
  structure (though not comments/original filenames beyond what Vite
  includes) to production. Increases deploy size and exposes internal
  structure to anyone who opens devtools.
- **Fix:** `sourcemap: false` for production, or `sourcemap: 'hidden'` if
  maps are wanted for crash-reporting tools without being linked from the
  shipped bundle.
- **Severity:** P2. **Mobile:** slightly (extra transfer if ever fetched).
  **Performance:** deploy-size only, not runtime. **Gameplay:** No.

---

### P2-2 — Single un-split 1.5 MB JS bundle
- **File:** build output (no `vite.config.ts` chunking configured).
- **Cause:** No `manualChunks`/dynamic `import()` anywhere; Phaser itself is
  the majority of the bundle weight.
- **Impact:** Rollup's own build output flags this
  (`chunks are larger than 500 kB after minification`). 350 KB gzip is not
  extreme for a Phaser game, but it is 100% blocking — nothing renders until
  the whole bundle parses, which matters more on mobile networks.
- **Fix:** Not urgent at this size, but worth a `manualChunks: { phaser: ["phaser"] }`
  split or raising `chunkSizeWarningLimit` deliberately (with a comment)
  rather than leaving the default warning as ambient noise.
- **Severity:** P2. **Mobile:** yes (slower first paint on cellular).
  **Performance:** yes (load-time). **Gameplay:** No.

---

### P2-3 — No favicon / no manifest
- **File:** `index.html`, `public/`
- **Cause:** No `<link rel="icon">` in `index.html`; no favicon file or
  `manifest.json` in `public/`.
- **Impact:** Reproducible 404 on every page load (captured live this
  session as a genuine browser console error — see Section 5). Minor
  polish gap, but it's a real, present error on every single load, not a
  hypothetical.
- **Fix:** Add a favicon (can be a simple generated PNG/ICO matching the
  game's color palette) and reference it from `index.html`; optionally add
  a `manifest.json` for "Add to Home Screen" on mobile, matching the mobile
  optimization work already done elsewhere.
- **Severity:** P2. **Mobile:** yes (affects "Add to Home Screen" polish).
  **Performance:** negligible. **Gameplay:** No.

---

### P2-4 — No top-level error handling around game bootstrap
- **File:** `src/main.ts`, `src/input/KeyboardInput.ts`
- **Cause:** `new Phaser.Game(...)` in `main.ts` has no surrounding
  try/catch. `KeyboardInput`'s constructor explicitly `throw`s if
  `scene.input.keyboard` is unavailable (a real possibility in some
  embedded/iframe/no-keyboard contexts).
- **Impact:** In an environment where keyboard input is unavailable, the
  thrown error is unhandled — the user sees a blank canvas with no
  explanation, only a console stack trace.
- **Fix:** Wrap bootstrap in a try/catch that renders a plain-DOM fallback
  message ("Your browser doesn't support this game") instead of a silent
  blank screen.
- **Severity:** P2. **Mobile:** low (touch-only devices still get
  `InputManager`'s touch path; keyboard failure specifically affects
  unusual embeds). **Performance:** No. **Gameplay:** No (availability, not
  balance).

---

### P2-5 — No `engines` field / no CI
- **File:** `package.json` (repo-wide: no `.github/workflows` for `game/`).
- **Cause:** Tooling/process gap, not a code bug.
- **Impact:** A broken build or a regression in `npx tsc --noEmit` could be
  merged without any automated signal.
- **Fix:** Add an `engines.node` constraint and a minimal CI job running
  `npm run build` on push/PR.
- **Severity:** P2. **Mobile:** No. **Performance:** No. **Gameplay:** No.

---

### P3-1 — `BootScene` has no `preload()`
- **File:** `src/scenes/BootScene.ts`
- **Cause:** Currently harmless — zero external assets are loaded anywhere
  in the project (see P1-2).
- **Impact:** None today. If/when audio or art assets are added, there is
  no loading-screen infrastructure to build on; would need to be added at
  that time rather than retrofitted under time pressure.
- **Severity:** P3. **Mobile:** No. **Performance:** No. **Gameplay:** No.

---

### P3-2 — HUD anchor positions don't react to safe-area changes after construction
- **File:** `src/ui/HUD.ts`, `src/scenes/MainScene.ts:147-149`
  (`applySafeArea`)
- **Cause:** `HUD`'s `barX`/`topY`/`coinsRightX` are computed once in the
  constructor from the safe-area insets passed in. `MainScene.applySafeArea()`
  (triggered on `RESIZE`/`ORIENTATION_CHANGE`) only calls
  `this.inputManager.updateSafeArea(...)` — `InputManager` has an
  `updateSafeArea` method and re-anchors the joystick/fire button, but `HUD`
  has no equivalent method and is never touched on resize.
- **Impact:** On an orientation change that changes the device's safe-area
  insets (e.g. portrait→landscape on a notched phone), the HUD text
  position stays fixed at the insets measured at scene creation — it could
  end up positioned under a notch/status-bar cutout until the next full
  reload.
- **Fix:** Add an `updateSafeArea()` method to `HUD` (reposition the
  existing text/rectangle objects) and call it from
  `MainScene.applySafeArea()` alongside the existing `InputManager` call.
- **Severity:** P3 (touch controls — the more safety-critical UI — are
  correctly handled; this is the informational HUD only).
  **Mobile:** yes. **Performance:** No. **Gameplay:** No (readability only).

---

### P3-3 — `ObjectPool.forEachActive()` / `activeCount` are O(poolSize) linear scans
- **File:** `src/systems/ObjectPool.ts`
- **Cause:** Both scan the full fixed-size pool array every call; called
  every frame for projectiles (40), enemies (40), and pickups (60).
- **Impact:** Negligible at current pool sizes (documented as an accepted
  tradeoff in a prior performance pass). Only worth revisiting if pool
  sizes are increased substantially in the future.
- **Severity:** P3. **Mobile:** negligible at current sizes.
  **Performance:** negligible at current sizes. **Gameplay:** No.

---

## 7. Verified NOT bugs (explicitly checked, ruled out this session)

- **`ENEMY_POOL_SIZE = 40` vs. Night 7 Wave 3's `enemyCount: 75`**: this is
  *not* a bug. `NightManager.updateWaveSpawning()` only advances
  `remainingToSpawn`/`spawnTimer` on a successful (non-null) spawn, and a
  wave only completes once `remainingToSpawn <= 0 && enemyManager.activeCount === 0`.
  The pool size acts as an intentional concurrency cap (documented in
  `CombatConfig.ts`'s own comment) — the wave simply takes longer to fully
  spawn+clear when its count exceeds the pool, it does not skip, crash, or
  corrupt enemies. Confirmed correct by reading the full state machine.
- **`ObjectPool.acquire()` pool-hijack bug** (flagged CRITICAL in a prior
  audit): confirmed **fixed** — `acquire()` now returns `T | null` with the
  hijacking `return this.items[0]` fallback completely removed, and every
  call site (`EnemyManager`, `ProjectileManager`, `PickupManager`,
  `NightManager`) correctly handles the `null` case.
- **Player getting "killed" while swarmed in a stress test**: confirmed to
  be the test's own aggressive technique (deliberately herding every enemy
  onto one point), not a game defect — `NightManager.update()`'s
  `if (player.isDead) return;` guard correctly freezes all progression as
  designed once it happens.

## 8. TOP 10 PRIORITIES (ordered by technical fix importance)

1. **P0-1** — Add a working Restart flow to `DeathScreen` and `VictoryScreen`.
   Nothing else matters if the game cannot be played twice.
2. **P1-3** — Cap upgrade stacking / clamp minimum fire interval before any
   balance tuning is meaningful.
3. **P1-4** — Fix the background-pause vs. upgrade-selection input overlap.
4. **P1-1** — Decide and implement (or formally cut) save/load persistence.
5. **P1-2** — Decide and implement (or formally cut) audio.
6. **P2-1** — Turn off production source maps.
7. **P2-3** — Add a favicon (removes a real, reproducible console error).
8. **P2-4** — Wrap game bootstrap in error handling with a user-visible
   fallback.
9. **P2-2** — Address the 1.5 MB single-chunk bundle (at least acknowledge
   deliberately, ideally split).
10. **P2-5 / P3-1 / P3-2** — Process hygiene (CI, `engines`), preload
    infrastructure for future assets, and HUD safe-area reactivity.

---

## Production Readiness Score: **58 / 100** (technical basis, no flattery)

Architecture, TypeScript hygiene, build cleanliness, and the previously-fixed
object-pooling correctness are genuinely strong — this is a well-organized
codebase with zero `any`, zero build errors, zero uncaught exceptions in live
testing, and a verified-correct core combat/wave loop. The score is held down
specifically by: a P0 defect that makes the game literally unplayable a
second time in the same session (no restart), two entire systems
(audio, save/load) that exist in code but are wired to nothing, an unbounded
progression system that breaks its own balance in a normal-length run, and a
plausible input-overlap bug on mobile. None of these are architectural
problems — they are finishing work — but "finishing work not done" is
exactly what a pre-launch audit exists to catch, and a player cannot start a
second run without reloading the page, which is disqualifying for a
commercial release as currently shipped.
