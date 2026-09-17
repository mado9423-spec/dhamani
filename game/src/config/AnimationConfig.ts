import Phaser from "phaser";

/**
 * Defines every sprite animation this game could use, but only for
 * sheets that actually finished loading (`scene.textures.exists(key)` —
 * a sheet whose load errored never gets added to the texture cache, so
 * this is naturally per-asset granular, independent of BootScene's
 * coarser `hasSpriteAssets` flag). Safe to call unconditionally: with no
 * sprite assets present (this project's current, zero-asset state),
 * every one of these is a no-op.
 */
export function defineAnimations(scene: Phaser.Scene): void {
  definePlayerAnimations(scene);
  defineEnemyAnimations(scene);
}

export function playerAnimKey(state: "idle" | "run" | "attack"): string {
  return `player-${state}`;
}

export function enemyAnimKey(type: string, state: "idle" | "move" | "hit" | "death"): string {
  return `${type}-${state}`;
}

interface ClipDefinition {
  key: string;
  textureKey: string;
  frameRate: number;
  repeat: number; // -1 loops, 0 plays once
}

function definePlayerAnimations(scene: Phaser.Scene): void {
  const clips: ClipDefinition[] = [
    { key: playerAnimKey("idle"), textureKey: "player_idle", frameRate: 6, repeat: -1 },
    { key: playerAnimKey("run"), textureKey: "player_run", frameRate: 10, repeat: -1 },
    { key: playerAnimKey("attack"), textureKey: "player_attack", frameRate: 14, repeat: 0 },
  ];

  for (const clip of clips) {
    createAnimFromWholeSheet(scene, clip);
  }
}

const ENEMY_TYPES = ["walker", "fast", "tank", "boss", "finalBoss"] as const;

// Each enemy type ships as a single sheet (see AssetConfig.ts) sliced
// into 4 consecutive state ranges, rather than 4 separate sheets per
// type. These frame ranges are structural placeholders — there's no
// real art yet to measure an actual layout from (see PROJECT_AUDIT.md's
// zero-asset design decisions) — and are inert today since none of
// these sheets load successfully; update the ranges once real sheets
// define the actual grid.
const ENEMY_STATE_FRAMES: Record<"idle" | "move" | "hit" | "death", { start: number; end: number; frameRate: number; repeat: number }> = {
  idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
  move: { start: 4, end: 9, frameRate: 10, repeat: -1 },
  hit: { start: 10, end: 11, frameRate: 12, repeat: 0 },
  death: { start: 12, end: 15, frameRate: 10, repeat: 0 },
};

function defineEnemyAnimations(scene: Phaser.Scene): void {
  for (const type of ENEMY_TYPES) {
    if (!scene.textures.exists(type)) {
      continue;
    }

    for (const state of Object.keys(ENEMY_STATE_FRAMES) as Array<keyof typeof ENEMY_STATE_FRAMES>) {
      const def = ENEMY_STATE_FRAMES[state];
      const key = enemyAnimKey(type, state);
      if (scene.anims.exists(key)) {
        continue;
      }

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(type, { start: def.start, end: def.end }),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  }
}

function createAnimFromWholeSheet(scene: Phaser.Scene, clip: ClipDefinition): void {
  if (!scene.textures.exists(clip.textureKey) || scene.anims.exists(clip.key)) {
    return;
  }

  scene.anims.create({
    key: clip.key,
    frames: scene.anims.generateFrameNumbers(clip.textureKey, {}),
    frameRate: clip.frameRate,
    repeat: clip.repeat,
  });
}
