/**
 * Pure, framework-free (Edge-safe) TTL cache for last-known-good indexability
 * decisions. No Node/Next imports — a Map plus an injectable clock — so it runs
 * wherever the indexability client runs.
 *
 * Scope: the cache is module state, i.e. per runtime instance. A serverless
 * instance starts cold with an empty cache and never shares it with its peers,
 * so this only covers the warm-instance case (steady traffic hitting an
 * instance that already answered for the same route). It is a mitigation, not
 * a durable store; a durable fix belongs in the indexer (stale-while-error).
 *
 * Two properties matter for correctness, because what is remembered here can
 * later be replayed as an *indexable* answer:
 *
 * 1. Writes are ordered by observation time, not by completion time. A caller
 *    stamps `observedAt` when it starts its lookup and passes it back on write,
 *    so a slow in-flight lookup can never overwrite a decision observed after
 *    it started (a `noindex` answer must not be clobbered by an older, delayed
 *    `indexable` one).
 * 2. `invalidate` writes a tombstone rather than deleting, so an authoritative
 *    removal cannot be undone by an older write that is still in flight. A
 *    tombstoned key reads as "nothing remembered" until it expires.
 */

export interface ProjectIndexabilityLkgCacheOptions {
  /** Maximum age of a usable entry. An entry is expired at exactly `ttlMs`. */
  ttlMs: number;
  /** Hard cap on retained entries; the oldest write is evicted first. */
  maxEntries: number;
  /** Injectable clock (see createDefaultClock) so TTL behavior is testable. */
  now?: () => number;
}

export interface ProjectIndexabilityLkgCache<TValue> {
  /** Reads the cache's own clock; stamp a lookup with it and pass it back on write. */
  now(): number;
  /** The remembered value, or null when nothing usable (missing, expired, tombstoned). */
  get(key: string): TValue | null;
  /** Remember a value unless a strictly newer observation is already stored. */
  set(key: string, value: TValue, observedAt?: number): void;
  /** Tombstone a key so nothing is replayed for it and no older write revives it. */
  invalidate(key: string, observedAt?: number): void;
  clear(): void;
}

interface CacheEntry<TValue> {
  /** null marks a tombstone: the key is known to have no replayable decision. */
  value: TValue | null;
  observedAt: number;
}

/**
 * The default clock, built so that neither available time source can understate
 * an entry's age — an understated age is what lets a stale "indexable" decision
 * outlive its TTL.
 *
 * Neither source is safe alone. The wall clock (`Date.now`) can step backwards
 * on an NTP correction. The monotonic clock (`performance.now`) never steps
 * back, but it does not advance while a serverless instance is frozen between
 * invocations, so an entry stored before a freeze would look brand new on thaw.
 *
 * So each reading advances by whichever source reports the larger elapsed time
 * since the previous reading, floored at zero. The result never runs backwards,
 * counts frozen time, and is only ever conservative (an over-counted age just
 * expires an entry early). Both sources are read through `globalThis` on every
 * call so a clock installed later — a test's fake timers, say — is the one used.
 *
 * Readings are whole milliseconds. `performance.now` is sub-millisecond, and
 * summing those fractions in a float makes a difference of two readings land a
 * few ulps off the true elapsed time — enough for an entry advanced by exactly
 * `ttlMs` to measure as 299999.99999999994 and survive its own expiry. The
 * sub-millisecond remainder is therefore carried separately and only folded in
 * once it completes a millisecond, so the returned value is an exact integer
 * and no precision is lost.
 */
function createDefaultClock(): () => number {
  const readMonotonic = (): number | null =>
    typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : null;

  let elapsed = 0;
  let remainder = 0;
  let lastWall = Date.now();
  let lastMonotonic = readMonotonic();

  return () => {
    const wall = Date.now();
    const monotonic = readMonotonic();
    const monotonicAdvance =
      monotonic !== null && lastMonotonic !== null ? monotonic - lastMonotonic : 0;
    const advance = remainder + Math.max(wall - lastWall, monotonicAdvance, 0);
    const wholeMs = Math.floor(advance);
    elapsed += wholeMs;
    remainder = advance - wholeMs;
    lastWall = wall;
    lastMonotonic = monotonic;
    return elapsed;
  };
}

/**
 * Create a bounded TTL cache. Entries expire lazily on read and are evicted in
 * write order (a re-set counts as a fresh write, both for the TTL and for the
 * eviction order) once `maxEntries` is exceeded. Eviction is therefore FIFO by
 * write, not LRU — reads do not refresh an entry — which is fine at this size:
 * every entry is capped by the same short TTL anyway.
 */
export function createProjectIndexabilityLkgCache<TValue>(
  options: ProjectIndexabilityLkgCacheOptions
): ProjectIndexabilityLkgCache<TValue> {
  const { ttlMs, maxEntries } = options;
  const now = options.now ?? createDefaultClock();
  const entries = new Map<string, CacheEntry<TValue>>();

  /**
   * Shared write path. Drops the write when the stored entry was observed
   * strictly later than this one; equal stamps fall through to last-write-wins,
   * which is all a clock of finite resolution can distinguish.
   */
  function write(key: string, value: TValue | null, observedAt: number): void {
    if (maxEntries <= 0) {
      return;
    }
    const stored = entries.get(key);
    if (stored && stored.observedAt > observedAt) {
      return;
    }
    // Re-inserting moves the key to the end of the Map's insertion order, so
    // eviction always drops the least-recently-written entry.
    entries.delete(key);
    entries.set(key, { value, observedAt });
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      entries.delete(oldestKey);
    }
  }

  return {
    now,

    get(key: string): TValue | null {
      const entry = entries.get(key);
      if (!entry) {
        return null;
      }
      if (now() - entry.observedAt >= ttlMs) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },

    set(key: string, value: TValue, observedAt: number = now()): void {
      write(key, value, observedAt);
    },

    invalidate(key: string, observedAt: number = now()): void {
      write(key, null, observedAt);
    },

    clear(): void {
      entries.clear();
    },
  };
}
