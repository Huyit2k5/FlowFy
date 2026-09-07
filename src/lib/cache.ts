/**
 * Simple in-memory cache with TTL.
 * For production multi-instance: swap to Upstash Redis (same interface).
 *
 * Usage:
 *   const key = cacheKey("workspace", wsId);
 *   const cached = getCached<Workspace>(key);
 *   if (cached) return cached;
 *   const data = await fetchFromDB();
 *   setCached(key, data, 60_000); // 60s TTL
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL = 60_000; // 60 seconds

let pruneInterval: ReturnType<typeof setInterval> | null = null;

function ensurePruner() {
  if (!pruneInterval) {
    pruneInterval = setInterval(prune, 60_000);
    if (pruneInterval.unref) pruneInterval.unref();
  }
}

function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.expiresAt) store.delete(key);
  }
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL) {
  ensurePruner();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(pattern: string) {
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}

export function clearCache() {
  store.clear();
}

export function cacheStats() {
  const now = Date.now();
  let valid = 0;
  for (const e of store.values()) {
    if (now < e.expiresAt) valid++;
  }
  return { size: store.size, valid };
}
