export interface PlayerStats {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackSpeed: number;
  experience: number;
  experienceToNextLevel: number;
  level: number;
  coins: number;
}

const BASE_EXPERIENCE_TO_LEVEL = 20;
const EXPERIENCE_GROWTH_FACTOR = 1.25;

export const DEFAULT_PLAYER_STATS: Readonly<PlayerStats> = {
  health: 100,
  maxHealth: 100,
  speed: 260,
  damage: 10,
  attackSpeed: 1,
  experience: 0,
  experienceToNextLevel: BASE_EXPERIENCE_TO_LEVEL,
  level: 1,
  coins: 0,
};

export function getExperienceForLevel(level: number): number {
  return Math.round(BASE_EXPERIENCE_TO_LEVEL * EXPERIENCE_GROWTH_FACTOR ** (level - 1));
}
