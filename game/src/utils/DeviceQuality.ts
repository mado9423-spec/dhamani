import { QualityLevel } from "../config/QualityConfig";

interface NavigatorWithHints extends Navigator {
  // Device Memory API — Chrome/Android only, not in standard DOM lib
  // types. Absent on iOS Safari and older browsers.
  deviceMemory?: number;
}

/**
 * Best-effort default quality tier based on device capability signals
 * available before the game boots. Android Chrome (the priority
 * target) exposes navigator.deviceMemory; browsers without any signal
 * fall back to "medium" rather than assuming the worst.
 */
export function detectDefaultQualityLevel(): QualityLevel {
  if (typeof navigator === "undefined") {
    return "medium";
  }

  const memory = (navigator as NavigatorWithHints).deviceMemory;
  if (typeof memory === "number") {
    if (memory <= 2) return "low";
    if (memory <= 4) return "medium";
    return "high";
  }

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number") {
    if (cores <= 2) return "low";
    if (cores <= 4) return "medium";
    return "high";
  }

  return "medium";
}
