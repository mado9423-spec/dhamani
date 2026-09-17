import { PlayerStats, UpgradeId } from "./PlayerConfig";

export interface UpgradeDefinition {
  id: UpgradeId;
  icon: string;
  label: string;
  apply: (stats: PlayerStats) => void;
}

// Hard cap on how many times a single upgrade can be picked in one run.
// Each pick compounds multiplicatively (see the `apply` functions below),
// so without a ceiling a long run (Night 7 alone offers enough level-ups
// to max several upgrades many times over) could push a stat — attack
// speed especially — toward an unsafe extreme. At 10 stacks: damage
// reaches 1.2^10 ≈ 6.2x, move speed 1.15^10 ≈ 4.1x, and attack speed
// 1.25^10 ≈ 9.3/sec (~107ms between shots) — strong but bounded, and the
// attack-speed case is additionally floored in CombatConfig via
// MIN_FIRE_INTERVAL_SECONDS regardless of this cap.
export const MAX_UPGRADE_LEVEL = 10;

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: "damage",
    icon: "🔥",
    label: "+20% Damage",
    apply: (stats) => {
      stats.damage = Math.round(stats.damage * 1.2 * 10) / 10;
    },
  },
  {
    id: "attackSpeed",
    icon: "⚡",
    label: "+25% Attack Speed",
    apply: (stats) => {
      stats.attackSpeed = Math.round(stats.attackSpeed * 1.25 * 100) / 100;
    },
  },
  {
    id: "moveSpeed",
    icon: "🏃",
    label: "+15% Movement Speed",
    apply: (stats) => {
      stats.speed = Math.round(stats.speed * 1.15);
    },
  },
];
