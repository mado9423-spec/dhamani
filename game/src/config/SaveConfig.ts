export interface SaveData {
  // 0 = never reached a night yet; 1-7 = furthest night whose boss was
  // defeated; 8 = the full 7-night campaign has been completed.
  bestNightReached: number;
  bestLevel: number;
  highScoreCoins: number;
}

export const SAVE_KEY = "progress";

export const DEFAULT_SAVE_DATA: Readonly<SaveData> = {
  bestNightReached: 0,
  bestLevel: 1,
  highScoreCoins: 0,
};

export const CAMPAIGN_COMPLETE_MARKER = 8;

export function describeBestNight(bestNightReached: number): string {
  if (bestNightReached >= CAMPAIGN_COMPLETE_MARKER) {
    return "Best: Campaign Complete!";
  }
  if (bestNightReached >= 1) {
    return `Best: Night ${bestNightReached}`;
  }
  return "";
}
