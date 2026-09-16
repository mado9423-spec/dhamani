export interface WaveDefinition {
  enemyCount: number;
}

export interface NightDefinition {
  waves: WaveDefinition[];
  // Scales spawned enemy/boss health, damage, and rewards for this
  // night, so surviving longer means fighting tougher things, not
  // just more of the same.
  difficultyMultiplier: number;
}

export const NIGHTS: NightDefinition[] = [
  { waves: [{ enemyCount: 10 }, { enemyCount: 15 }, { enemyCount: 25 }], difficultyMultiplier: 1.0 },
  { waves: [{ enemyCount: 14 }, { enemyCount: 20 }, { enemyCount: 32 }], difficultyMultiplier: 1.15 },
  { waves: [{ enemyCount: 18 }, { enemyCount: 26 }, { enemyCount: 40 }], difficultyMultiplier: 1.3 },
  { waves: [{ enemyCount: 22 }, { enemyCount: 32 }, { enemyCount: 48 }], difficultyMultiplier: 1.45 },
  { waves: [{ enemyCount: 26 }, { enemyCount: 38 }, { enemyCount: 56 }], difficultyMultiplier: 1.6 },
  { waves: [{ enemyCount: 30 }, { enemyCount: 44 }, { enemyCount: 64 }], difficultyMultiplier: 1.75 },
  { waves: [{ enemyCount: 35 }, { enemyCount: 50 }, { enemyCount: 75 }], difficultyMultiplier: 1.9 },
];

// How often a new enemy is placed while a wave is spawning its quota.
export const WAVE_SPAWN_INTERVAL_MS = 700;

// How long the "Wave X" / "BOSS" banner stays up before that phase starts.
export const PHASE_INTRO_MS = 2200;
