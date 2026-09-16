const STORAGE_PREFIX = "survive-7-nights:";

/**
 * Typed localStorage wrapper. try/catch is required here because
 * localStorage can throw (private browsing, quota exceeded, disabled
 * storage) — this is a system boundary, not defensive dead code.
 */
export class SaveManager {
  static get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage unavailable; state simply won't persist this session.
    }
  }

  static remove(key: string): void {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Storage unavailable; nothing to clean up.
    }
  }
}
