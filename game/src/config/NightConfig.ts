import { EnemyType } from "./EnemyConfig";

export interface WaveDefinition {
  enemyCount: number;
}

// The three original types every night can spawn. leaper/exploder/
// ranged are layered on top progressively (see NIGHTS below) instead of
// every night, so the campaign's escalation isn't just "more/tougher of
// the same three" — new threats (a jumper, a suicide bomber, a kiting
// shooter) keep showing up as it goes.
const CORE_TYPES: EnemyType[] = ["walker", "fast", "tank"];

export interface NightDefinition {
  waves: WaveDefinition[];
  // Scales spawned enemy/boss health, damage, and rewards for this
  // night, so surviving longer means fighting tougher things, not
  // just more of the same.
  difficultyMultiplier: number;
  // Which EnemyType's NightManager's random wave spawning can pick from
  // this night.
  enemyTypes: EnemyType[];
}

export const NIGHTS: NightDefinition[] = [
  {
    waves: [{ enemyCount: 10 }, { enemyCount: 15 }, { enemyCount: 25 }],
    difficultyMultiplier: 1.0,
    enemyTypes: CORE_TYPES,
  },
  {
    waves: [{ enemyCount: 14 }, { enemyCount: 20 }, { enemyCount: 32 }],
    difficultyMultiplier: 1.15,
    enemyTypes: CORE_TYPES,
  },
  // "leaper" enters at the midpoint of the campaign.
  {
    waves: [{ enemyCount: 18 }, { enemyCount: 26 }, { enemyCount: 40 }],
    difficultyMultiplier: 1.3,
    enemyTypes: [...CORE_TYPES, "leaper"],
  },
  // "ranged" joins the following night.
  {
    waves: [{ enemyCount: 22 }, { enemyCount: 32 }, { enemyCount: 48 }],
    difficultyMultiplier: 1.45,
    enemyTypes: [...CORE_TYPES, "leaper", "ranged"],
  },
  {
    waves: [{ enemyCount: 26 }, { enemyCount: 38 }, { enemyCount: 56 }],
    difficultyMultiplier: 1.6,
    enemyTypes: [...CORE_TYPES, "leaper", "ranged"],
  },
  // "exploder" is held back for the final two nights — the most
  // punishing type (highest damage stat) only shows up once the player
  // is already well into the late-game power curve.
  {
    waves: [{ enemyCount: 30 }, { enemyCount: 44 }, { enemyCount: 64 }],
    difficultyMultiplier: 1.75,
    enemyTypes: [...CORE_TYPES, "leaper", "ranged", "exploder"],
  },
  {
    waves: [{ enemyCount: 35 }, { enemyCount: 50 }, { enemyCount: 75 }],
    difficultyMultiplier: 1.9,
    enemyTypes: [...CORE_TYPES, "leaper", "ranged", "exploder"],
  },
];

// How often a new enemy is placed while a wave is spawning its quota.
export const WAVE_SPAWN_INTERVAL_MS = 700;

// How long the "Wave X" / "BOSS" banner stays up before that phase starts.
export const PHASE_INTRO_MS = 2200;
