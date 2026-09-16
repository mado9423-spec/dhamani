import { PlayerStats } from "./PlayerConfig";

export type UpgradeId = "damage" | "attackSpeed" | "moveSpeed";

export interface UpgradeDefinition {
  id: UpgradeId;
  icon: string;
  label: string;
  apply: (stats: PlayerStats) => void;
}

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
