export type EnemyType = "walker" | "fast" | "tank";
export type EnemyTypeId = EnemyType | "boss" | "finalBoss";

export interface EnemyStats {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number; // seconds between attacks
  xpReward: number;
  coinReward: number;
}

export interface EnemyVisual {
  radius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
}

export interface EnemyDefinition {
  stats: EnemyStats;
  visual: EnemyVisual;
}

// attackRange is kept a few px larger than (enemy radius + player radius,
// currently 18) so enemies stop just short of overlapping the player.
export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  walker: {
    stats: {
      health: 30,
      maxHealth: 30,
      speed: 90,
      damage: 8,
      attackRange: 38,
      attackCooldown: 1,
      xpReward: 5,
      coinReward: 1,
    },
    visual: { radius: 16, color: 0xffa94d, strokeColor: 0x7a4a17, strokeWidth: 2 },
  },
  fast: {
    stats: {
      health: 16,
      maxHealth: 16,
      speed: 190,
      damage: 5,
      attackRange: 33,
      attackCooldown: 0.6,
      xpReward: 4,
      coinReward: 1,
    },
    visual: { radius: 11, color: 0xff6b9d, strokeColor: 0x82264a, strokeWidth: 2 },
  },
  tank: {
    stats: {
      health: 90,
      maxHealth: 90,
      speed: 55,
      damage: 16,
      attackRange: 46,
      attackCooldown: 1.4,
      xpReward: 12,
      coinReward: 3,
    },
    visual: { radius: 24, color: 0x8b2635, strokeColor: 0x3d0f16, strokeWidth: 3 },
  },
};

export const ENEMY_TYPES: EnemyType[] = ["walker", "fast", "tank"];

// Boss/finalBoss aren't part of ENEMY_DEFINITIONS/ENEMY_TYPES since
// they're never picked by random wave spawning — NightManager spawns
// them explicitly once a night's waves are cleared.
export const BOSS_DEFINITION: EnemyDefinition = {
  stats: {
    health: 600,
    maxHealth: 600,
    speed: 70,
    damage: 26,
    attackRange: 70,
    attackCooldown: 1.1,
    xpReward: 100,
    coinReward: 40,
  },
  visual: { radius: 46, color: 0x9333ea, strokeColor: 0x2e0a4d, strokeWidth: 5 },
};

// The Night 7 capstone. A distinct (bigger, tougher) definition rather
// than just BOSS_DEFINITION with a bonus multiplier, so it also reads
// as visually different (biggest, darkest) — not just "boss but more".
export const FINAL_BOSS_DEFINITION: EnemyDefinition = {
  stats: {
    health: 900,
    maxHealth: 900,
    speed: 65,
    damage: 34,
    attackRange: 78,
    attackCooldown: 1.0,
    xpReward: 180,
    coinReward: 70,
  },
  visual: { radius: 56, color: 0x7f1d1d, strokeColor: 0x1a0505, strokeWidth: 6 },
};

export function getEnemyDefinition(type: EnemyTypeId): EnemyDefinition {
  if (type === "boss") {
    return BOSS_DEFINITION;
  }
  if (type === "finalBoss") {
    return FINAL_BOSS_DEFINITION;
  }
  return ENEMY_DEFINITIONS[type];
}
