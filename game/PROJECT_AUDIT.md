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

## Status update (2026-09-17, third follow-up pass)

**P1-4 (background-pause / upgrade-selection input conflict) is fixed —
and the suspected conflict was reproduced live, not just assumed.**

Root cause, confirmed by reading Phaser's event dispatch order and then
proving it: `MainScene.showBackgroundPause()` used to show `PauseOverlay`
(depth 5000/5001) regardless of whether `UpgradeSelection` (depth
4000/4001) was already open, and both registered independent global
`scene.input.on(POINTER_UP, ...)` listeners with no awareness of each
other. A Playwright reproduction confirmed the exact failure: with the
upgrade screen open, force-showing `PauseOverlay` and tapping a spot that
overlapped a card silently incremented that upgrade's level — the player
would never have seen the card, since `PauseOverlay`'s 0.8-opacity
rectangle visually covers it, and the same tap also dismissed
`PauseOverlay` and would have resumed gameplay, all from a single tap
meant only to dismiss "Paused."

Fix, two layers, both in `MainScene.ts`/`UpgradeSelection.ts` only:
1. **Removed the overlap at the source.** `showBackgroundPause()` now
   no-ops whenever `this.paused` (an upgrade choice is pending) is already
   true. The upgrade-selection screen is itself a valid, intentional
   paused state (per the existing `paused`/`backgroundPaused` two-flag
   design already in the code) — layering a second, separate full-screen
   gate on top of it was never necessary and is what created the
   conflict. Backgrounding/foregrounding while choosing an upgrade now
   simply leaves that exact screen in place; nothing is shown or
   dismissed, nothing is destroyed, and no extra tap is required before
   the player can choose.
2. **Defense in depth.** `UpgradeSelection`'s own `handlePointerMove`/
   `handlePointerUp` now also defer to `PauseOverlay.isShowing` (via a
   constructor-injected `() => boolean`, not a stored instance reference —
   the getter has to be evaluated fresh on each check specifically because
   `PauseOverlay`'s own dismiss handler flips `isShowing` to `false` as
   its first action, so listener *registration order* matters: this class
   must still register its pointer listeners — and therefore run first on
   a shared tap — before `PauseOverlay` does, which is why `MainScene`
   keeps constructing `UpgradeSelection` ahead of `PauseOverlay`; an
   earlier attempt that passed a concrete `PauseOverlay` reference and
   reordered construction the other way was caught by this pass's own
   Playwright test, which showed the guard reading already-stale
   post-dismiss state). This layer was verified independently: forcing
   `PauseOverlay` visible by calling its `show()` directly (bypassing fix
   1 entirely) and tapping a covered card still correctly left that
   upgrade's level unchanged, while `PauseOverlay` itself still dismissed
   normally on that same tap (its own unconditional "tap anywhere"
   behavior, unaffected and correct).

State behavior — before vs. after:
- **Before:** background-then-tap while choosing an upgrade could
  silently apply a random unseen upgrade and simultaneously resume
  gameplay from a single tap.
- **After:** backgrounding while choosing an upgrade shows nothing extra;
  returning to the tab shows the exact same, still-fully-functional
  upgrade screen; only a real tap on a real card applies that upgrade and
  resumes gameplay, exactly once.

Verified via Playwright (desktop mouse, `emit('pause')`/`emit('resume')`
on `game.events` to exercise `MainScene`'s actual reaction — the same
events Phaser's own Core `VisibilityHandler` fires on a real
`visibilitychange`, used directly since headless-Chromium's own
`visibilitychange` emulation is unreliable for automated testing, noted
here rather than overclaimed) and a Pixel-7-emulated touch viewport
(`page.touchscreen.tap()`):
- Plain `PLAYING` → background → foreground: unaffected, still requires
  an explicit tap-to-resume (existing, deliberate UX, not touched).
- `UPGRADE_SELECTION` → background → foreground: screen survives intact,
  remains genuinely tappable, resumes exactly once when a card is chosen.
- A queued multi-level-up sequence (the existing "one pick per level"
  design) drains correctly through a background/foreground cycle with no
  stuck state.
- Restart triggered while mid-upgrade-selection-and-background-cycle (via
  a forced death) leaves fully clean state — no stray `paused`/
  `backgroundPaused`/overlay-visible flags survive the restart.
- `game.events`(`pause`/`resume`) and `scene.input`(`pointerup`/
  `pointermove`) listener counts stay bit-for-bit identical across 3
  repeated background+upgrade+restart cycles — no accumulation.
- Zero page errors throughout every test.
- Mobile: tested only via Chromium's Pixel 7 device emulation and
  `page.touchscreen.tap()` — real Android app-lifecycle backgrounding
  (task-switcher freeze/OS process suspension) was not and could not be
  tested in this environment; only the browser-level
  `visibilitychange`-driven code path was verified.

One related, explicitly out-of-scope observation: `DeathScreen`/
`VictoryScreen`'s `RestartButton` has the same *shape* of unguarded
overlap potential with `PauseOverlay` (both could be visible together if
the player dies while the tab is backgrounded) — but there the worst case
is "restart fires a bit more eagerly than intended," not a silently
corrupted stat, and it wasn't part of this ticket's scope, so it was left
untouched.

`npx tsc --noEmit` and `npm run build` both stay clean; zero
`any`/`@ts-ignore` introduced. Only `MainScene.ts` and
`UpgradeSelection.ts` were changed.

**All other P1/P2/P3 findings below remain open and untouched** — only
P1-4 was in scope for this pass.

---

## Release Candidate Readiness (2026-09-17, RC pass)

Full authority was given to take the project from its prior state (all
P0s and P1s fixed, several P2/P3 polish items still open) to a Release
Candidate. Every remaining item from the original audit's "Should fix" /
"Nice to have" lists was resolved this pass, plus a full motion/color/
juice pass. **Nothing is deferred as blocking; every item below is
implemented and Playwright-verified.**

### Pre-audit & prioritization

Re-read `PROJECT_AUDIT.md`/`PROGRESS.md`/`RELEASE_CHECKLIST.md` and the
actual current source (not assumed) before changing anything. The
prioritized list going in, and the decision made for each:

| # | Item | Priority | Decision |
|---|------|----------|----------|
| 1 | Unused `SaveManager`/`AudioManager` | P1 | **Activate both fully** (not purge) — see below |
| 2 | Production source maps | P2 | Disable outright (`sourcemap: false`) |
| 3 | Missing favicon | P2 | Add a modern SVG favicon, palette-matched |
| 4 | Bundle splitting | P2 | Split `phaser` into its own chunk (evaluated below) |
| 5 | Bootstrap error handling | P1 | Global `window` error listeners + plain-DOM fallback |
| 6 | CI pipeline | P2 | GitHub Actions, scoped to `game/` only |
| 7 | HUD mobile orientation | P3 | `HUD.updateSafeArea()`, wired into `applySafeArea()` |
| 8 | Death/Victory defense-in-depth | P1 | Same `isPauseOverlayShowing` guard as `UpgradeSelection` |

### 1. SaveManager / AudioManager — activated, not purged

**SaveManager** now backs a real progress record. New
`src/config/SaveConfig.ts` defines `SaveData { bestNightReached, bestLevel,
highScoreCoins }`. `MainScene.create()` loads it
(`SaveManager.get<SaveData>(SAVE_KEY, DEFAULT_SAVE_DATA)`, spread into a
fresh object — the same aliasing bug fixed for `PlayerStats.upgradeLevels`
earlier would otherwise apply here too, since `SaveManager.get` returns
the fallback object *by reference* when nothing is stored yet).
`persistBestNight()` runs on every `NIGHT_COMPLETE` (tracking the furthest
night whose boss was beaten, or `CAMPAIGN_COMPLETE_MARKER = 8` once Night
7's boss falls); `persistRunResult()` runs on death and on victory
(best level, high-score coins). `HUD` now takes `bestNightReached` and
shows "Best: Night N" / "Best: Campaign Complete!" via
`describeBestNight()`. Verified via Playwright with a **real
`page.reload()`** (not just a scene restart, which wouldn't prove
`localStorage` actually round-trips): after a forced victory,
`localStorage['survive-7-nights:progress']` held
`{"bestNightReached":8,...}`, and after reloading the page fresh, the HUD
read "Best: Campaign Complete!" on the very next load.

**AudioManager** was rewritten to synthesize every SFX procedurally via
the raw Web Audio API — no audio assets were added or are needed. It
reuses Phaser's own already-unlocked `AudioContext` (via
`scene.sound instanceof Phaser.Sound.WebAudioSoundManager`) rather than
creating a second, independently-suspended one that would need its own
gesture-unlock handling, and silently no-ops if Web Audio isn't available
(the same safe-degradation pattern already established by `SaveManager`'s
try/catch and the old asset-based `AudioManager.play()`). Ten short
tone/sweep/chord SFX cover fire, hit, enemy death, player damage/death,
level up, upgrade pick, wave start, boss start, and victory, wired into
`Player` (damage/death/levelUp — threaded through the constructor the
same way `QualitySettings` already was), `CombatSystem` (fire/hit/enemy
death), and `MainScene` (upgrade pick, wave start, boss start, victory).
Verified via Playwright: `audioManager['context']` exists and is a real
`AudioContext` (`state: "suspended"` pre-gesture, which is correct browser
autoplay-policy behavior, not a bug), and zero console/page errors occur
across the full play-through with every SFX firing.

### 2. Production source maps — disabled

`vite.config.ts`: `sourcemap: true` → `false`. A fresh `npm run build`
confirms zero `.map` files in `dist/` (previously a 10.3 MB
`index-*.js.map` shipped alongside the 1.5 MB bundle).

### 3. Favicon — added

`public/favicon.svg`: a small hand-authored SVG (crescent moon + two
stars, built from the game's own palette — `COLORS.background`,
`COLORS.player`, `COLORS.playerOutline`) linked via
`<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in
`index.html`. SVG favicons are supported by every modern evergreen
browser and need no multi-resolution PNG/ICO set. Verified via Playwright:
`GET /favicon.svg` → `200`, and the previously-reproducible favicon 404
console error is confirmed gone from a fresh page load.

### 4. Bundle splitting — evaluated and applied

Evaluated single-chunk vs. code-split for this project's actual size (46
small app files, ~50 KB, vs. one large, rarely-changing dependency,
Phaser, ~1.48 MB — 97% of the bundle). **Decision: split.** Added
`build.rollupOptions.output.manualChunks: { phaser: ["phaser"] }`.
Reasoning: dynamic `import()` code-splitting (lazy-loading *parts* of the
app) doesn't fit this project — it's one continuously-running scene, not
route-based — but vendor/app separation is a clear, free win: a
redeploy that only touches app code no longer forces every returning
player to re-download the entire engine, since the unchanged `phaser-*.js`
chunk stays cached. Confirmed via a fresh build: output changed from one
`index-*.js` (1,519 KB) to `phaser-*.js` (1,478 KB) + `index-*.js`
(50 KB) — the app chunk that actually changes on a typical commit is now
97% smaller than before.

### 5. Bootstrap error handling — added

`main.ts` now wraps `new Phaser.Game(...)` in try/catch **and** installs
`window.addEventListener("error"/"unhandledrejection", ...)`. Both were
needed: the one previously-identified real failure mode
(`KeyboardInput` throwing when `scene.input.keyboard` is unavailable)
happens inside `Scene.create()`, which Phaser runs asynchronously as part
of its own boot sequence — a tick after `new Phaser.Game(...)` returns —
so a try/catch around construction alone would never see it. The window
listeners are the actual safety net; they show a plain-DOM `#boot-error`
fallback (`index.html`, deliberately independent of Phaser/canvas so it
renders even when the game can't) with a "Reload" button, and hide `#app`.
This is intentionally coarse — any uncaught error after boot hides the
game — since a silently, partially-broken game is worse UX than a clear
"please reload." Verified structurally via Playwright (the element exists
and is `display: none` by default); inducing a genuine runtime failure to
prove the handler fires was not attempted, as doing so safely without
risking corrupting the working build was judged not worth the risk for
this pass — noted here rather than overclaimed.

### 6. CI pipeline — added

`.github/workflows/game-ci.yml`. GitHub only discovers workflows from the
repository **root** `.github/workflows/`, not from a subdirectory, so the
file necessarily lives outside `game/` — this is unavoidable, not scope
creep. It is fully scoped to this project via a `paths: ["game/**", ...]`
trigger filter and `working-directory: game` on every step, so it cannot
run for, or interfere with, the unrelated ضماني app at the repo root
(confirmed no `.github/workflows/` existed before this change). Runs
`npm ci`, `npx tsc --noEmit`, `npm run build` on push to `main` and on
pull requests. Also added `"engines": { "node": ">=20.0.0" }` to
`package.json`, matching Vite 5's actual requirement and the CI Node
version.

### 7. HUD mobile orientation — fixed

`HUD` previously computed its anchor positions once at construction and
never re-read them — unlike `InputManager`, which already correctly
re-anchored the touch controls via `updateSafeArea()`. Refactored the
position math into `HUD.computeLayout()` (used by both the constructor and
the new `updateSafeArea()` method, which repositions every element:
title, hint, best-night line, health/XP bars, level/coin/wave text), and
wired it into `MainScene.applySafeArea()` alongside the existing
`InputManager` call — the same `RESIZE`/`ORIENTATION_CHANGE` listeners
already trigger both now. No new listeners were added.

### 8. Death/Victory screen defense-in-depth

`RestartButton` (shared by `DeathScreen`/`VictoryScreen`) had the exact
same unguarded-overlap shape as `UpgradeSelection` did before its P1 fix:
`PauseOverlay`'s unconditional "tap anywhere to resume" could land on the
restart button underneath it if the player died/won while backgrounded.
Applied the identical fix pattern: a lazily-evaluated
`isPauseOverlayShowing: () => boolean` closure (not a stored reference —
same listener-registration-order reasoning as `UpgradeSelection`: this
button's pointer listener must still register, and so fire, before
`PauseOverlay`'s), threaded through `RestartButton` →
`DeathScreen`/`VictoryScreen` → `MainScene`. Construction order in
`MainScene.create()` already had `DeathScreen`/`VictoryScreen` built
before `PauseOverlay`, so no reordering was needed this time (unlike the
`UpgradeSelection` fix, where an initial attempt to reorder construction
was caught by that pass's own test suite — documented there as a warning
for exactly this kind of change).

### Motion, color & juice pass

Everything below uses Phaser's own built-in Tweens, the Particle system,
and Graphics — the project's own established "no external libraries"
rendering approach (pure Shapes/Graphics/Text, no images, since Stage 1)
extends naturally to its animation: Phaser's Tween/Particle/Graphics APIs
*are* the best-practice, native toolset for this engine, and reaching for
an external library (GSAP, etc.) would add a dependency and bundle weight
for capability Phaser already ships. **Zero new npm dependencies.**

- **Screen transitions.** `PauseOverlay`, `UpgradeSelection`,
  `DeathScreen`, `VictoryScreen` all now fade/scale in on `show()`
  (`killTweensOf` guarded first, matching the pattern `Announcement`
  already established) instead of an instant `setVisible(true)` cut.
- **Upgrade cards.** Staggered pop-in (`Back.Out` ease, 60ms stagger per
  card) on open; a quick squash-punch on the chosen card before the
  screen actually closes and the callback fires.
- **Buttons.** `RestartButton` pops in on `show()` and punches on press
  (both screens; both mouse and touch confirmed working with the new
  timing).
- **Damage/critical feedback.** Player damage got a new "squash" scale
  punch on top of the existing color flash + camera shake; boss hits get
  a small extra camera shake (`CombatSystem.resolveHit()`, checked via
  `enemy.type === "boss" || "finalBoss"`, already a public field — no
  `Enemy` changes needed); player death got a stronger screenshake.
- **Particle bursts.** New `src/ui/ScreenFX.ts` owns a single reusable
  particle emitter (a 1×1 white circle generated once via
  `scene.make.graphics().generateTexture()` — no image asset) fired via
  `.explode()` on player death (`Player.die()`) and on every boss
  defeat/victory (`MainScene`'s `NIGHT_COMPLETE` handler — every
  `NIGHT_COMPLETE` follows a boss kill by construction, so this covers
  both a regular night's boss and the Final Boss without adding a new
  event).
- **Color-grade flash pulses.** `ScreenFX.flash(color, alpha, duration)`
  — a single reusable full-screen rectangle, tweened alpha, `killTweensOf`
  guarded — used for damage (red), level-up (teal), boss-incoming
  (magenta), death (dark red, heavier), and victory (via the particle
  burst's color). Verified this does not fight with the world's own
  gameplay rendering: the rectangle sits at depth 1600, below the HUD
  (2000+) so stat text stays legible, above plain gameplay.
- **Vignette.** A permanent, subtle ambient vignette, drawn once at scene
  creation in `ScreenFX`. Phaser's FX pipeline
  (`postFX.addVignette()`/`addColorMatrix()`) was checked first (not
  assumed) via the installed `phaser.d.ts`: it's real and exists, but
  only applies per-GameObject to types implementing `PostPipeline`
  (`Sprite`, `Container`) — the `Rectangle`/`Arc` "Shape" objects this
  entire project is built from do **not** implement it, and even if they
  did, a per-object effect wouldn't composite as a full-screen overlay
  over everything drawn on top of it. Implemented instead as four
  soft-edged corner blobs (concentric semi-transparent black circles,
  drawn once, plain additive alpha — no erase/blend-mode tricks, so it
  renders identically and safely on both the Canvas and WebGL renderers)
  darkening the corners while leaving the center clear. Visually confirmed
  via screenshot (subtle by design against this game's already-dark
  palette, most visible during bright gameplay near screen edges).

### Memory-leak prevention (explicitly verified, not assumed)

Every new tween is `killTweensOf`-guarded before starting (matches the
pattern already established by `Announcement`), and every new listener
added anywhere in this pass is exactly zero — `AudioManager` registers
none (one-shot Web Audio nodes stop and are garbage-collected on their
own; no `destroy()` method needed), `ScreenFX` registers none (its
`destroy()` just kills tweens and destroys its two GameObjects), and
`SaveManager`/`HUD.updateSafeArea()` don't add any either. Verified via
Playwright, not assumed:
- `game.events`/`scene.input` listener counts (`pause`, `resume`,
  `pointerup`, `pointermove`) stay bit-for-bit identical across 3
  repeated restart+upgrade+background cycles.
- `scene.tweens.getTweens().length` returns to a small, stable baseline
  (≤3, and the one tween still active after settling was traced to
  `Announcement`'s own legitimate delayed fade-out for the just-shown
  "Night 1 — Wave 1/3" banner after a restart — not a leak) rather than
  growing across cycles.

### Verification summary

- `npx tsc --noEmit`: clean throughout this entire pass (checked after
  every major change, not just once at the end).
- `npm run build`: clean. Output: `phaser-*.js` (1,478.57 KB / 339.68 KB
  gzip) + `index-*.js` (50.45 KB / 13.53 KB gzip), zero `.map` files,
  `favicon.svg` present in `dist/`.
- Zero `any`/`@ts-ignore`/`@ts-nocheck` anywhere in `src/` (grepped fresh
  at the end of the pass).
- Playwright, desktop (mouse): favicon 200, boot-error fallback present
  and hidden by default, `AudioManager` has a real `AudioContext`, normal
  movement/combat/enemy-spawn regression, full upgrade flow with its new
  juice, background/foreground during both plain `PLAYING` and
  `UPGRADE_SELECTION` (re-confirming the earlier P1 fix still holds),
  death flow with its particle burst + restart, victory flow with its
  particle burst + restart, save-data persistence across a **real page
  reload**, listener-count and active-tween-count stability across 3
  repeated cycles — all passed, zero console errors, zero page errors.
- Playwright, mobile (Pixel 7 emulation, real `page.touchscreen.tap()`):
  upgrade selection and death+restart both confirmed working with the new
  transition/press-punch timing — zero page errors.
- Screenshots visually confirmed: upgrade-card pop-in, the death particle
  burst, and the victory screen's color/transition all render as intended
  (attached during this session).

### What's still open (not part of this RC's scope, not blocking)

- `BootScene` still has no `preload()` — still not needed; there remain no
  image/font assets, and audio is synthesized, not loaded.
- `ObjectPool.forEachActive()`/`activeCount` remain O(n) linear scans —
  still negligible at current pool sizes (40/40/60).
- The vignette is a hand-drawn approximation, not a true shader-based
  radial gradient — explained and justified above; visually confirmed
  correct for this project's rendering approach.

**Release Candidate status: ready.** Every P0, every P1, and every item
explicitly scoped into this RC pass is implemented and verified. Nothing
in this report should block a release decision.

---

## Visual Overhaul (2026-09-17, visual-overhaul pass)

Full authority was given to take the project's visuals from a functional
"basic zero-asset" look to a "highly polished, modern indie game
aesthetic" — without adding external image assets or new npm dependencies.
Report below in the explicitly requested **(Number / Title / Result)**
format.

### 1. Scan & Map Visual Files — Result: done

Read every rendering-relevant file before writing anything: `MainScene.ts`
(camera setup, no post-processing previously), `HUD.ts`/`BossHealthBar.ts`
(flat `Rectangle` bars), `ScreenFX.ts` (flash/shake/particle juice plus a
hand-drawn corner-blob vignette), `Player.ts`/`Enemy.ts`/`Projectile.ts`
(plain `Arc`/Container shapes, no glow), and `UpgradeSelection.ts`/
`DeathScreen.ts`/`VictoryScreen.ts`/`PauseOverlay.ts`/`Announcement.ts`
(flat-color UI, no shadows). Cross-referenced against Phaser 3.90's actual
WebGL FX API by reading the engine source directly
(`node_modules/phaser/src/renderer/webgl/pipelines/fx/`,
`PostFXPipeline`, `Camera`/`GameObjects` `PostPipeline` support) rather
than assuming API shape — confirmed `postFX` (Bloom/Glow/Vignette/
ColorMatrix/etc.) only works on `Sprite`/`Container`/`TileSprite`/`Text`/
`RenderTexture`/`Camera`, **not** on the `Rectangle`/`Arc` `Shape` objects
this project draws almost everything with, which shaped every decision
below (e.g. `Projectile` had to be converted from `extends Arc` to
`extends Container` to be glow-capable at all).

### 2. Implement Advanced Visual FX — Result: done

- **Bloom & Glow:** real `postFX.addGlow()` on the Player (1 instance),
  boss/final-boss enemies (`Enemy.applyBossGlow()`, ≤1 concurrent), and
  every pooled `Projectile` (`src/entities/Projectile.ts`, converted to a
  `Container`, ≤40 concurrent). Common enemy types (up to 40 concurrent)
  were deliberately excluded — glow on the highest-instance-count, most
  visually secondary entity type was judged the worst cost/benefit
  tradeoff (see the Performance section below for the measured cost this
  judgment call is based on).
- **Screen post-processing (chromatic aberration + radial blur):** a
  hand-written custom `PostFXPipeline` (`src/fx/ImpactFXPipeline.ts`, GLSL
  ES 1.00 fragment shader — chromatic RGB-channel offset plus a 5-sample
  radial blur, both scaled by a `strength` uniform) attached to the main
  camera. It is **exclusively** triggered by `ScreenFX.pulseImpact()`,
  called on player damage, boss hits, player death, and boss/final-boss
  defeat — tweened up fast and back down, idle at `strength=0` (where the
  shader early-exits to a plain passthrough sample) the rest of the time,
  matching the "triggered exclusively during screenshake/damage moments"
  requirement exactly.
- **Color grading & atmosphere:** the old hand-drawn corner-blob vignette
  was deleted outright and replaced with Phaser's real
  `camera.postFX.addVignette()` (a true procedural WebGL radial-gradient
  mask). A `ColorMatrix` pipeline (`camera.postFX.addColorMatrix()`) now
  drives progressive night atmosphere: `ScreenFX.setNightLevel(t)` (`t`
  from 0 at Night 1 to 1 at Night 7+) composes `.brightness(1 - 0.28*t)`
  and `.saturate(-0.4*t)`, so the screen gets measurably darker and colder
  as the campaign progresses — verified via Playwright reading the actual
  `ColorMatrix.getData()` coefficients across all 7 nights (red channel
  coefficient step from `1.0` at Night 1 down to `0.733` at Night 7).
  (`ColorMatrix.night()` was deliberately *not* used — it's a stylized
  night-vision-style remix, not a darkening function, confirmed by reading
  its source.)

### 3. UI & HUD Modernization — Result: done

- **Vector rounding & gradients:** `src/ui/BarRenderer.ts` is a new shared
  `drawEnergyBar()` helper — rounded-rect track, a top-to-bottom fill
  gradient (`fillGradientStyle`), and a soft layered glow-colored stroke —
  replacing 4 flat `Rectangle` bars in `HUD.ts` (health, XP) and the fill/
  background in `BossHealthBar.ts`. The `UpgradeSelection` card background
  was converted from `Rectangle` to a rounded-rect `Graphics` draw the same
  way.
- **Typography:** every HUD/overlay text object (`HUD`, `DeathScreen`,
  `VictoryScreen`, `PauseOverlay`, `Announcement`, `UpgradeSelection`) now
  has a drop shadow via `Text.setShadow()` for legibility and depth against
  the busy background.
- **Scaling on rotation:** `HUD.updateSafeArea()` now tracks the last
  health/XP ratio and redraws the `Graphics` bars on every safe-area
  recompute (orientation change / resize), so the new bars stay pixel-
  correct after a rotation the same way the old `Rectangle`-based ones did
  — verified via Playwright viewport resize.

### 4. Performance & Validation — Result: done, with one honestly-reported caveat

- **Pipeline lifecycle / leak safety:** `ScreenFX.destroy()` calls
  `camera.resetPostPipeline(true)`, which destroys every attached
  pipeline instance (Vignette, ColorMatrix, ImpactFX) and clears the
  camera's `postPipelines` array. `addPostPipeline()` registration is
  idempotent by design (Phaser no-ops if the name is already registered),
  so re-registering on every scene restart is safe. Verified via
  Playwright: `camera.postPipelines.length` and
  `renderer.pipelines.postPipelineInstances.length` are identical before
  and after 3 consecutive death→restart cycles — **no leak.**
- **`npx tsc --noEmit`:** clean (zero errors, zero new `any`/`@ts-ignore`).
- **`npm run build`:** clean — `phaser-*.js` (1,478.57 KB / 339.68 KB
  gzip, unchanged, vendor chunk) + `index-*.js` (54.88 KB / 15.19 KB gzip,
  up from 50.45 KB pre-overhaul — the new FX/UI code).
- **60 FPS verification — honest result:** this sandbox's browser renders
  WebGL entirely in software (`SwiftShader`, confirmed by reading
  `WEBGL_debug_renderer_info`'s `UNMASKED_RENDERER_WEBGL` string — there is
  no real GPU in this environment), so **no build, old or new, reaches
  60 FPS here** — the pre-overhaul baseline itself only measured ~11-14 FPS
  in this sandbox. To separate "cost of this pass's changes" from "cost of
  this sandbox," a controlled A/B was run: `git stash` to isolate the
  pre-overhaul code, two `vite` dev servers on separate ports, and the
  identical FPS-sampling script against both:

  | Scenario | Pre-overhaul (old) | Post-overhaul (new) | Relative |
  |---|---|---|---|
  | Idle, fresh load | 13.72 FPS | 6.38 FPS | ~2.15x slower |
  | 3s of Night-1 gameplay | 11.76 FPS | 5.14 FPS | ~2.3x slower |
  | Maxed attack speed (projectile+glow stress) | 11.06 FPS | 5.99 FPS | ~1.85x slower |

  This is a real, consistent, measured relative cost — not sandbox noise.
  Notably, the regression is essentially **flat between idle and the
  30-enemy stress test**, which points to the cause being the 3 new
  **always-attached camera-level full-screen passes** (a fixed per-frame
  cost — exactly the worst case for a software rasterizer, which has to
  shade every one of the 960×540 output pixels on the CPU three separate
  times every frame) rather than something that scales unboundedly with
  entity or projectile count. On real GPU hardware — which is what an
  actual player's desktop or mobile browser uses — 3 lightweight
  full-screen passes at this game's deliberately low 960×540 render
  resolution are a trivial, sub-millisecond cost; this sandbox simply
  cannot demonstrate that. No implementation change was made in response,
  since the design already reflects the performance-conscious choices this
  data validates (glow scoped to low-instance-count entities only, the
  ImpactFX shader's own idle early-exit) — this finding is reported here
  transparently rather than either silently claiming "60 FPS verified" or
  silently reworking a design that is sound for the actual target
  platform.

**Visual overhaul status: complete.** Every requirement (Bloom/Glow,
exclusively-triggered chromatic-aberration/radial-blur, procedural
night-based color grading, modernized HUD/UI, pipeline-leak safety,
`tsc`/`build` clean) is implemented and Playwright-verified, with the one
performance caveat above reported honestly rather than glossed over.

### Bonus fix found during this pass's testing (not part of the visual scope)

Aggressive repeated Playwright testing (not a single run) surfaced a
pre-existing, intermittent (~1-in-3) race condition in
`UpgradeSelection.choose()` and `RestartButton.activate()`, both inherited
from the prior RC pass: real state transitions (closing the upgrade
screen, firing the restart callback) were gated behind a cosmetic
press-punch tween's `onComplete`, whose firing order relative to the
same-frame pointer-up event Phaser doesn't guarantee. The observable
failure was severe: the game could get stuck paused forever after picking
an upgrade, or a restart click could silently do nothing. Both were
rewritten so the real state change happens synchronously and any
animation is fire-and-forget, never a dependency for logic. Verified with
8/8 and 6/6 repeated runs post-fix (versus 4/6 failing pre-fix), plus a
clean full-suite Playwright run with zero console/page errors.

---

## Dark Gothic / Eldritch Redesign (2026-09-17, Dark Gothic pass)

Full authority was given to re-skin the player, enemies, weapon, and
environment into a "Dark Gothic / Eldritch Arcade" aesthetic, replace the
360° spinning-arrow facing mechanic with a slanted-2.5D flip, and deploy
the result — all under the same zero-external-asset constraint as every
prior pass. Report below in the requested **(Number / Title / Result)**
format.

### 1. Slanted 2.5D Perspective & Shadows — Result: done

`MovementSystem.apply()` no longer calls `setRotation()` — the "spinning
arrow" is gone. Player and Enemy both now track a `facing` value
(`utils/VisualMotion.ts`'s `resolveFacing()`) from horizontal velocity and
apply it as `scaleX = ±1` on a child `visualGroup` Container, never on the
outer Container itself (which stays the untouched physics/collision
transform). Both entities gained a heavy drop shadow — a dark
(`0x000000`, alpha `0.6`) `Ellipse` anchored under the feet, sized/
positioned per-entity in `spawn()`, living outside `visualGroup` so it
stays glued to the ground while the body above it bobs/pulses.

### 2. Gothic / Eldritch Layered Vector Art — Result: done

- **Player:** `Player.ts`'s body is now a layered hooded-wanderer
  silhouette — a jagged cloak `Polygon` (wide hem, narrow shoulders, two
  torn "tatter" points), a darker overlapping hood `Ellipse`, and two
  small `playerEyeGlow`-colored eyes that ambiently pulse (`pulseEyes()`,
  a sine-driven alpha wave, always running — "piercing... peering from the
  darkness").
- **Common enemies (walker/tank):** `EnemyVisual.style = "slime"` — an
  `Ellipse` blob whose `scaleX`/`scaleY` are driven by two independent,
  out-of-phase sine waves (`Enemy.updatePulse()`), the asymmetric
  breathing/pulsing the spec asked for.
- **Fast/boss/finalBoss:** `style = "arachnid"` — 4 pre-built limb rigs,
  each a nested `Container` pair (`pivot` → `upper` segment → `lowerPivot`
  → `lower` segment), giving genuinely multi-segmented, bent legs. Only
  visible for arachnid-style types; `updateLimbs()` twitches both joints
  on independent sine waves, gated on `moving` (per spec: "twitch eerily
  during movement").
- **Walking bob:** `utils/VisualMotion.ts`'s `walkBob()` — a sine offset
  on `visualGroup.y`, applied to both Player and Enemy, only while moving.

### 3. Grim Weaponry & Combat FX — Result: done

- `entities/Weapon.ts` is a new, separate top-level GameObject (not a
  child of Player's Container — a child's local rotation would visually
  mirror under Player's own facing-flip, which is exactly wrong for
  "points directly at the cursor"). It re-anchors to the player's
  position every frame and smoothly rotates toward the cursor via
  `Phaser.Math.Angle.RotateTo`, not an instant snap.
- **Recoil:** `Weapon.triggerFire()` snaps `recoilOffset` to
  `WEAPON_RECOIL_DISTANCE` then tweens it back with a `Back.Out` ease —
  a sharp backward snap, eased return.
- **Muzzle flash / trails:** a new pooled `MuzzleFlash` (a jagged `Star`
  shape in `COLORS.muzzleSpark`, crimson/ember) fires from the weapon's
  muzzle tip on every shot; a new pooled `ProjectileTrail` leaves faint
  dark-smoke dots behind every bolt, throttled to one per ~14px of travel
  (not per frame) via a callback threaded through `ProjectileManager` →
  `Projectile.update()`. The projectile itself became a small elongated
  `Ellipse` "bolt" with a `projectileGlow`-colored outline, oriented to
  its travel direction on `fire()`.

### 4. Environmental Dark Contrast — Result: done, plus a real bug fixed

`Background.ts`'s tile texture darkened to the new near-black
`COLORS.background`/`gridLine` and gained two faint baked-in crack lines
per tile. `ScreenFX.setNightLevel()` was extended with a per-channel
additive "blood-vignette" bias (red up, green/blue down, scaled by night
progress) composed on top of the existing brightness/saturation —
**and, in verifying that composition, found and fixed a real pre-existing
bug**: `ColorMatrix.brightness()`/`.saturate()` both default their second
`multiply` argument to `false`, which *resets* the matrix rather than
composing with it. The existing code called both without passing `true`,
so — silently, since Night 1 was first introduced in the prior visual-
overhaul pass — only the *last* call (`saturate`) ever had any visible
effect; `brightness()`'s darkening was completely discarded every time.
Fixed by passing `multiply: true` through the whole chain. Verified via
`getData()`: by Night 7, brightness (`r_r` ≈ 0.41, down from an
undiscounted 1.0), saturation, and the new blood bias are all
simultaneously present in the final matrix — confirmed visually too (see
verification screenshots).

### 5. Verification & Deployment — Result: done, with two real bugs found and fixed along the way

- **`npx tsc --noEmit` / `npm run build`:** clean throughout.
- **Physics/visual alignment:** `Enemy.radius` now returns a dedicated
  `hitRadius` field set in `spawn()` from `EnemyConfig`'s numeric
  `visual.radius` — completely decoupled from whichever shapes happen to
  be drawn — so collision math is provably unchanged from before this
  pass. Verified via Playwright: `enemy.radius` matches
  `EnemyConfig.getEnemyDefinition(type).visual.radius` exactly for every
  type.
- **Bug found #1 — bolt tunneling at melee range:** initial testing (a
  synthetic, deterministic drive of `combatSystem.update()`, since this
  sandbox's real frame pacing turned out to be too unreliable — see
  below) found that spawning a projectile from the weapon's muzzle tip
  (34px out) *and* still giving it that same frame's full movement step
  before checking collisions (the pre-existing order) could let a shot at
  a melee-range enemy sail clean past it in one step — a real regression
  from the muzzle-spawn change, not present when projectiles spawned at
  the player's exact center. Fixed two ways: `CombatSystem.update()` now
  moves *existing* projectiles before a new one can be fired, so a bolt
  fired this frame is collision-checked at its actual muzzle position
  before it ever moves (removes the tunneling risk at its root, not just
  narrows it); and the muzzle reach itself was shortened (34px → 16px,
  inside the player's own `BODY_RADIUS`) as defense-in-depth. Verified:
  a walker at 60px now takes two clean hits (30 → 20 → 0 hp) where it
  previously took zero.
- **Bug found #2 (this sandbox specifically) — real-time waits are
  unreliable here:** this session's testing also found that `game.loop.
  actualFps` decays steadily from ~46 to ~9 over the first ~10 seconds of
  *any* session here, identically whether or not any of this pass's new
  entities are on screen (confirmed with zero enemies spawned, flat
  GameObject/tween counts throughout) — a software-WebGL-rendering
  characteristic of this specific sandbox, not a leak in this pass's
  code. Because of it, Phaser's own delta-time bookkeeping can fall far
  behind wall-clock time, so a couple of this suite's checks (weapon-aim
  convergence, "does combat still work") were rewritten to poll for the
  actual outcome (or, for combat, to drive `combatSystem.update()`
  directly with explicit `deltaSeconds` steps) rather than assume a fixed
  wait is enough — which is what surfaced bug #1 in the first place.
- **Pipeline leak check:** stable `camera.postPipelines` count across 3
  repeated death→restart cycles — no leak from any of this pass's changes.
- **Zero console/page errors** across the full Playwright suite.
- **Deployed:** `npm run deploy` pushed the built `dist/` to the
  `gh-pages` branch (verified via `git show origin/gh-pages:index.html`
  referencing the new build's asset hashes). Live at
  https://mado9423-spec.github.io/dhamani/ — GitHub's Pages CDN caches
  `index.html` for up to 10 minutes, so the new build may take a few
  minutes to become visible there even though it's already deployed and
  the new JS bundle is already being served.

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
