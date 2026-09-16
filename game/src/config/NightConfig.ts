export interface WaveDefinition {
  enemyCount: number;
}

export interface NightDefinition {
  waves: WaveDefinition[];
}

export const NIGHTS: NightDefinition[] = [
  {
    waves: [{ enemyCount: 10 }, { enemyCount: 15 }, { enemyCount: 25 }],
  },
];

// How often a new enemy is placed while a wave is spawning its quota.
export const WAVE_SPAWN_INTERVAL_MS = 700;

// How long the "Wave X" / "BOSS" banner stays up before that phase starts.
export const PHASE_INTRO_MS = 2200;
