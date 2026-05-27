/**
 * Safe localStorage utilities for PhishGuard.
 * Guards against:
 * - QuotaExceededError (localStorage full)
 * - Corrupted JSON values
 * - SSR environments (typeof window === 'undefined')
 * - Overly large values before writing
 */

// Maximum bytes to store for a single key (512 KB to stay safe)
const MAX_ITEM_SIZE_BYTES = 512 * 1024;

/**
 * Safely read a string from localStorage. Returns null on any failure.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write a string to localStorage.
 * Silently fails if the value is too large or localStorage is unavailable.
 * Returns true on success, false on failure.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (value.length > MAX_ITEM_SIZE_BYTES) {
      console.warn(`[localStorage] Value for key "${key}" exceeds max size (${MAX_ITEM_SIZE_BYTES} bytes). Skipping write.`);
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // QuotaExceededError or SecurityError
    console.warn(`[localStorage] Failed to write key "${key}":`, err);
    return false;
  }
}

/**
 * Safely remove a key from localStorage.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

/**
 * Safely parse a JSON value from localStorage.
 * Returns the fallback value on any failure (missing key, bad JSON, SSR).
 */
export function safeParseJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[localStorage] Failed to parse JSON for key "${key}". Returning fallback.`);
    return fallback;
  }
}

/**
 * Safely serialize and store a JSON value in localStorage.
 * Returns true on success.
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    return safeSetItem(key, serialized);
  } catch {
    console.warn(`[localStorage] Failed to serialize JSON for key "${key}".`);
    return false;
  }
}
