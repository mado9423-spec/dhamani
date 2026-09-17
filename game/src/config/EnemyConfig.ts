export type EnemyType = "walker" | "fast" | "tank" | "leaper" | "exploder" | "ranged";
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

// "slime" = an unstable, asymmetrically-pulsing void blob (walker/tank).
// "arachnid" = a slime body plus twitching multi-segmented limbs
// (fast/boss/finalBoss) — see Enemy.ts for how each is actually drawn.
export type EnemyVisualStyle = "slime" | "arachnid";

export interface EnemyVisual {
  radius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  style: EnemyVisualStyle;
  eyeColor: number;
  // Only meaningful (and only drawn) when style === "arachnid".
  limbColor: number;
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
    visual: {
      radius: 16,
      color: 0x2c1f38,
      strokeColor: 0x120a18,
      strokeWidth: 2,
      style: "slime",
      eyeColor: 0xcfe0a8,
      limbColor: 0x000000,
    },
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
    visual: {
      radius: 11,
      color: 0x1c1626,
      strokeColor: 0x0a0710,
      strokeWidth: 2,
      style: "arachnid",
      eyeColor: 0xff8f6b,
      limbColor: 0x9c8f7a,
    },
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
    visual: {
      radius: 24,
      color: 0x3a1424,
      strokeColor: 0x150609,
      strokeWidth: 3,
      style: "slime",
      eyeColor: 0xcfe0a8,
      limbColor: 0x000000,
    },
  },
  // Jumps toward the player in bursts instead of closing the distance
  // linearly like walker/fast/tank. Springy jointed legs read as
  // "arachnid" (twitchy limbs) rather than a pulsing blob.
  leaper: {
    stats: {
      health: 20,
      maxHealth: 20,
      speed: 150,
      damage: 9,
      attackRange: 36,
      attackCooldown: 0.9,
      xpReward: 6,
      coinReward: 2,
    },
    visual: {
      radius: 14,
      color: 0x1e2b1a,
      strokeColor: 0x0a120a,
      strokeWidth: 2,
      style: "arachnid",
      eyeColor: 0xbfff6b,
      limbColor: 0x4a6a3a,
    },
  },
  // Detonates in an AoE burst on death instead of just stopping dead —
  // fragile but its damage stat reflects the explosion payoff, not a
  // melee hit. Kept "slime" (unstable blob about to burst) rather than
  // "arachnid".
  exploder: {
    stats: {
      health: 14,
      maxHealth: 14,
      speed: 110,
      damage: 20,
      attackRange: 30,
      attackCooldown: 1.2,
      xpReward: 7,
      coinReward: 2,
    },
    visual: {
      radius: 13,
      color: 0x4a2410,
      strokeColor: 0x1a0d05,
      strokeWidth: 2,
      style: "slime",
      eyeColor: 0xfff066,
      limbColor: 0x000000,
    },
  },
  // Fires a projectile from range instead of closing in — attackRange is
  // far beyond every melee type's (well under PLAYER_FIRE_RANGE=380 so
  // the player can still out-range it), speed is low since it kites
  // rather than rushes, and attackCooldown is slower than the melee
  // types to balance the range advantage.
  ranged: {
    stats: {
      health: 18,
      maxHealth: 18,
      speed: 70,
      damage: 10,
      attackRange: 220,
      attackCooldown: 1.6,
      xpReward: 8,
      coinReward: 2,
    },
    visual: {
      radius: 12,
      color: 0x1a1030,
      strokeColor: 0x080314,
      strokeWidth: 2,
      style: "arachnid",
      eyeColor: 0x8f6bff,
      limbColor: 0x5a3a8f,
    },
  },
};

// Boss/finalBoss aren't part of ENEMY_DEFINITIONS since they're never
// picked by random wave spawning — NightManager spawns them explicitly
// once a night's waves are cleared. Which of the six EnemyType's above
// are actually in a given night's random-spawn pool lives in
// NightConfig.ts's NightDefinition.enemyTypes (introduced progressively
// across the campaign), not a single flat list here.
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
  visual: {
    radius: 46,
    color: 0x5c0f2a,
    strokeColor: 0x1c0410,
    strokeWidth: 5,
    style: "arachnid",
    eyeColor: 0xffb03d,
    limbColor: 0x6a1622,
  },
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
  visual: {
    radius: 56,
    color: 0x2b0509,
    strokeColor: 0x0a0102,
    strokeWidth: 6,
    style: "arachnid",
    eyeColor: 0xff3b4d,
    limbColor: 0x3a0a12,
  },
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
