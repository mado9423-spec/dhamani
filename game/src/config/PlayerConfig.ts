import { ORB_SPLASH_RADIUS_BASE, SHOTGUN_PELLET_COUNT_BASE, WeaponTypeId } from "./CombatConfig";

// The set of player stats that can be picked as a level-up upgrade — see
// config/UpgradeConfig.ts for the actual upgrade definitions/effects.
export type UpgradeId = "damage" | "attackSpeed" | "moveSpeed" | "shotgunWeapon" | "orbWeapon";

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
  // Exactly one equipped at a time (see entities/Weapon.ts) — starts as
  // the original single-target bolt, switched by picking the
  // corresponding shotgunWeapon/orbWeapon upgrade below.
  weaponType: WeaponTypeId;
  // Only meaningful once weaponType is "shotgun"/"orb" respectively —
  // harmless unused defaults otherwise. Scaled by that weapon's own
  // upgrade in UpgradeConfig.ts, not the generic damage/attackSpeed ones.
  shotgunPelletCount: number;
  orbSplashRadius: number;
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
    upgradeLevels: { damage: 0, attackSpeed: 0, moveSpeed: 0, shotgunWeapon: 0, orbWeapon: 0 },
    weaponType: "bolt",
    shotgunPelletCount: SHOTGUN_PELLET_COUNT_BASE,
    orbSplashRadius: ORB_SPLASH_RADIUS_BASE,
  };
}

export function getExperienceForLevel(level: number): number {
  return Math.round(BASE_EXPERIENCE_TO_LEVEL * EXPERIENCE_GROWTH_FACTOR ** (level - 1));
}
