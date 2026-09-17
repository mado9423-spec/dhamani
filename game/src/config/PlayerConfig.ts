// The set of player stats that can be picked as a level-up upgrade — see
// config/UpgradeConfig.ts for the actual upgrade definitions/effects.
export type UpgradeId = "damage" | "attackSpeed" | "moveSpeed";

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
  // How many times each upgrade has been picked this run — checked
  // against UpgradeConfig.MAX_UPGRADE_LEVEL before applying another.
  upgradeLevels: Record<UpgradeId, number>;
}

const BASE_EXPERIENCE_TO_LEVEL = 20;
const EXPERIENCE_GROWTH_FACTOR = 1.25;

// A factory (not a shared constant object) so every Player/restart gets
// its own fresh `upgradeLevels` object — a plain shared object here would
// let one run's upgrade picks leak into the next run's starting state.
export function createDefaultPlayerStats(): PlayerStats {
  return {
    health: 100,
    maxHealth: 100,
    speed: 260,
    damage: 10,
    attackSpeed: 1,
    experience: 0,
    experienceToNextLevel: BASE_EXPERIENCE_TO_LEVEL,
    level: 1,
    coins: 0,
    upgradeLevels: { damage: 0, attackSpeed: 0, moveSpeed: 0 },
  };
}

export function getExperienceForLevel(level: number): number {
  return Math.round(BASE_EXPERIENCE_TO_LEVEL * EXPERIENCE_GROWTH_FACTOR ** (level - 1));
}
