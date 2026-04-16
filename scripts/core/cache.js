/**
 * Lightweight in-memory TTL cache.
 *
 * Improvements over the original:
 *  - `deleteCached(key)` for targeted invalidation without wiping everything
 *  - LRU-style eviction: when the Map exceeds MAX_SIZE, the oldest half is pruned
 *  - `getCachedOrSet(key, factory, ttl)` for the common "read or populate" pattern
 */

const CACHE_TTL = 300_000; // 5 minutes
const MAX_SIZE  = 200;     // prevent unbounded growth in long sessions

const cache = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttl = CACHE_TTL) {
  if (cache.size >= MAX_SIZE) _evictOldest();
  cache.set(key, { value, expires: Date.now() + ttl });
}

/** Remove a single entry without clearing the whole cache. */
export function deleteCached(key) {
  cache.delete(key);
}

/** Clear all entries (e.g. on settings change). */
export function clearCache() {
  cache.clear();
}

/**
 * Return the cached value for `key`, or call `factory()` to produce and cache it.
 * `factory` may be async — the resolved value is stored.
 */
export async function getCachedOrSet(key, factory, ttl = CACHE_TTL) {
  const hit = getCached(key);
  if (hit !== null) return hit;
  const value = await factory();
  setCached(key, value, ttl);
  return value;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _evictOldest() {
  // Map preserves insertion order; delete the first half.
  const keys = Array.from(cache.keys());
  const cutoff = Math.floor(keys.length / 2);
  for (let i = 0; i < cutoff; i++) cache.delete(keys[i]);
}
