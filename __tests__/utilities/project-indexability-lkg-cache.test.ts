import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectIndexabilityLkgCache } from "@/utilities/project-indexability-lkg-cache";

/**
 * Bounded last-known-good store behind the indexability fallback. The TTL is
 * the safety boundary — an entry is usable strictly *before* `ttlMs` has
 * elapsed and never at or after it — so the boundary is pinned exactly, with an
 * injected clock rather than wall-clock sleeps.
 */

const TTL_MS = 5 * 60 * 1000;

function createClock(startAt = 1_000_000) {
  let current = startAt;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function createCache(maxEntries = 3) {
  const clock = createClock();
  const cache = createProjectIndexabilityLkgCache<string>({
    ttlMs: TTL_MS,
    maxEntries,
    now: clock.now,
  });
  return { cache, clock };
}

describe("createProjectIndexabilityLkgCache", () => {
  it("returns null for an unknown key", () => {
    const { cache } = createCache();

    expect(cache.get("missing")).toBeNull();
  });

  it("returns a stored value within the TTL", () => {
    const { cache, clock } = createCache();
    cache.set("a", "canonical-indexable");
    clock.advance(1);

    expect(cache.get("a")).toBe("canonical-indexable");
  });

  it("still returns the value one millisecond before the TTL boundary", () => {
    const { cache, clock } = createCache();
    cache.set("a", "canonical-indexable");
    clock.advance(TTL_MS - 1);

    expect(cache.get("a")).toBe("canonical-indexable");
  });

  it("expires the value at exactly the TTL boundary", () => {
    const { cache, clock } = createCache();
    cache.set("a", "canonical-indexable");
    clock.advance(TTL_MS);

    expect(cache.get("a")).toBeNull();
  });

  it("drops the expired entry so a later read stays null even if the clock rewinds", () => {
    const clock = createClock();
    const cache = createProjectIndexabilityLkgCache<string>({
      ttlMs: TTL_MS,
      maxEntries: 3,
      now: clock.now,
    });
    cache.set("a", "canonical-indexable");
    clock.advance(TTL_MS);
    expect(cache.get("a")).toBeNull();

    clock.advance(-TTL_MS);

    expect(cache.get("a")).toBeNull();
  });

  it("refreshes the age when a key is written again", () => {
    const { cache, clock } = createCache();
    cache.set("a", "first");
    clock.advance(TTL_MS - 1);
    cache.set("a", "second");
    clock.advance(TTL_MS - 1);

    expect(cache.get("a")).toBe("second");
  });

  it("evicts the oldest write once maxEntries is exceeded", () => {
    const { cache } = createCache(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    cache.set("d", "4");

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("treats a rewrite as a fresh write for eviction order", () => {
    const { cache } = createCache(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    cache.set("a", "1-again");
    cache.set("d", "4");

    // "b" was the oldest remaining write once "a" was rewritten.
    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).toBe("1-again");
    expect(cache.get("d")).toBe("4");
  });

  it("stores nothing when maxEntries is zero", () => {
    const cache = createProjectIndexabilityLkgCache<string>({ ttlMs: TTL_MS, maxEntries: 0 });
    cache.set("a", "1");

    expect(cache.get("a")).toBeNull();
  });

  it("empties every entry on clear", () => {
    const { cache } = createCache();
    cache.set("a", "1");
    cache.set("b", "2");

    cache.clear();

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });

  it("defaults to the real clock when none is injected", () => {
    const cache = createProjectIndexabilityLkgCache<string>({ ttlMs: TTL_MS, maxEntries: 3 });
    cache.set("a", "1");

    expect(cache.get("a")).toBe("1");
  });

  it("exposes a clock that never runs backwards", () => {
    const cache = createProjectIndexabilityLkgCache<string>({ ttlMs: TTL_MS, maxEntries: 3 });

    const first = cache.now();
    const second = cache.now();

    expect(typeof first).toBe("number");
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it("reads back the injected clock", () => {
    const { cache, clock } = createCache();
    clock.advance(42);

    expect(cache.now()).toBe(clock.now());
  });
});

/**
 * Write ordering. What is remembered here is later replayed as an authoritative
 * answer during an outage, so a write may only land if nothing newer is already
 * known — otherwise a slow lookup that started before a project changed state
 * would clobber the fresher decision on arrival, and an authoritative removal
 * could be undone by an older response still in flight.
 */
describe("createProjectIndexabilityLkgCache write ordering", () => {
  it("ignores a write observed before the stored entry", () => {
    const { cache, clock } = createCache();
    const staleObservedAt = clock.now();
    clock.advance(1000);
    cache.set("a", "noindex");

    cache.set("a", "indexable", staleObservedAt);

    expect(cache.get("a")).toBe("noindex");
  });

  it("keeps the stored entry's own age when an older write is ignored", () => {
    const { cache, clock } = createCache();
    const staleObservedAt = clock.now();
    clock.advance(1000);
    cache.set("a", "noindex");

    cache.set("a", "indexable", staleObservedAt);
    clock.advance(TTL_MS - 1);

    // The rejected write must not have refreshed the TTL either.
    expect(cache.get("a")).toBe("noindex");
    clock.advance(1);
    expect(cache.get("a")).toBeNull();
  });

  it("accepts a write observed after the stored entry", () => {
    const { cache, clock } = createCache();
    cache.set("a", "indexable");
    clock.advance(1000);

    cache.set("a", "noindex", clock.now());

    expect(cache.get("a")).toBe("noindex");
  });
});

/**
 * Invalidation is a tombstone, not a delete: a removed route must read as
 * "nothing remembered" *and* stay unrecoverable by an older in-flight write.
 */
describe("createProjectIndexabilityLkgCache invalidation", () => {
  it("stops replaying a value once the key is invalidated", () => {
    const { cache } = createCache();
    cache.set("a", "indexable");

    cache.invalidate("a");

    expect(cache.get("a")).toBeNull();
  });

  it("blocks an older write from resurrecting an invalidated key", () => {
    const { cache, clock } = createCache();
    const staleObservedAt = clock.now();
    clock.advance(1000);
    cache.invalidate("a");

    cache.set("a", "indexable", staleObservedAt);

    expect(cache.get("a")).toBeNull();
  });

  it("lets a newer write replace the tombstone", () => {
    const { cache, clock } = createCache();
    cache.invalidate("a");
    clock.advance(1000);

    cache.set("a", "indexable", clock.now());

    expect(cache.get("a")).toBe("indexable");
  });

  it("counts a tombstone against maxEntries and evicts it in write order", () => {
    const { cache } = createCache(2);
    cache.invalidate("a");
    cache.set("b", "2");
    cache.set("c", "3");

    // "a" was the oldest write, tombstone or not, so it is the one dropped.
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  it("stores no tombstone when maxEntries is zero", () => {
    const cache = createProjectIndexabilityLkgCache<string>({ ttlMs: TTL_MS, maxEntries: 0 });

    cache.invalidate("a");

    expect(cache.get("a")).toBeNull();
  });
});

/**
 * The default clock, exercised through the TTL because that is the only thing
 * it exists for. Neither time source can be trusted alone: the wall clock steps
 * backwards on an NTP correction, and the monotonic clock stops while a
 * serverless instance is frozen. Either failure would understate an entry's age
 * and keep a stale "indexable" decision replayable past its TTL, so the age has
 * to follow whichever source reports more elapsed time.
 */
describe("createProjectIndexabilityLkgCache default clock", () => {
  const START_WALL = 1_700_000_000_000;

  function stubClocks(startMonotonic: number | null) {
    let wall = START_WALL;
    let monotonic = startMonotonic;
    vi.spyOn(Date, "now").mockImplementation(() => wall);
    vi.stubGlobal("performance", monotonic === null ? undefined : { now: () => monotonic });
    return {
      setWall: (value: number) => {
        wall = value;
      },
      setMonotonic: (value: number) => {
        monotonic = value;
      },
    };
  }

  function createDefaultClockCache() {
    return createProjectIndexabilityLkgCache<string>({ ttlMs: TTL_MS, maxEntries: 3 });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps an entry that is fresh on both clocks", () => {
    const clocks = stubClocks(0);
    const cache = createDefaultClockCache();
    cache.set("a", "indexable");

    clocks.setWall(START_WALL + 1000);
    clocks.setMonotonic(1000);

    expect(cache.get("a")).toBe("indexable");
  });

  it("expires an entry when the wall clock steps backwards mid-TTL", () => {
    const clocks = stubClocks(0);
    const cache = createDefaultClockCache();
    cache.set("a", "indexable");

    // An NTP correction drags the wall clock back an hour while the TTL elapses.
    clocks.setWall(START_WALL - 60 * 60 * 1000);
    clocks.setMonotonic(TTL_MS);

    expect(cache.get("a")).toBeNull();
  });

  it("expires an entry after a freeze the monotonic clock never saw", () => {
    const clocks = stubClocks(0);
    const cache = createDefaultClockCache();
    cache.set("a", "indexable");

    // The instance was frozen: wall time moved on, performance.now did not.
    clocks.setWall(START_WALL + TTL_MS);

    expect(cache.get("a")).toBeNull();
  });

  it("falls back to the wall clock when no monotonic clock exists", () => {
    const clocks = stubClocks(null);
    const cache = createDefaultClockCache();
    cache.set("a", "indexable");

    clocks.setWall(START_WALL + TTL_MS);

    expect(cache.get("a")).toBeNull();
  });

  it("reports whole milliseconds even though performance.now is sub-millisecond", () => {
    const clocks = stubClocks(0);
    const cache = createDefaultClockCache();

    clocks.setMonotonic(1.5);

    expect(Number.isInteger(cache.now())).toBe(true);
  });

  it("expires an entry at exactly the TTL after a sub-millisecond reading", () => {
    // `performance.now` is fractional, so an accumulated age carries a
    // fraction. Summing that fraction into a float makes the difference of two
    // readings land a few ulps low — 324759.206784 + TTL_MS reads back as
    // 299999.99999999994 elapsed — which would keep a stale decision usable one
    // tick past its own expiry.
    const FRACTIONAL_MONOTONIC = 324_759.206784;
    const clocks = stubClocks(0);
    const cache = createDefaultClockCache();

    clocks.setMonotonic(FRACTIONAL_MONOTONIC);
    cache.set("a", "indexable");

    clocks.setWall(START_WALL + TTL_MS);
    clocks.setMonotonic(FRACTIONAL_MONOTONIC + TTL_MS);

    expect(cache.get("a")).toBeNull();
  });
});
