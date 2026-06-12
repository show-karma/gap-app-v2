/**
 * Stable, shared empty references for use as fallbacks in Zustand v5 selectors
 * (and any `useSyncExternalStore`-backed read).
 *
 * Zustand v5 compares each selector's result with `Object.is`. Returning a
 * freshly-allocated `[]` or `{}` from inside a selector — e.g.
 * `useStore((s) => s.map[id] ?? [])` — produces a new reference on every render,
 * so the store snapshot never stabilizes. React then re-renders forever and
 * throws minified error #185 ("Maximum update depth exceeded").
 *
 * The rule: never build the fallback inside the selector. Select the raw value
 * and apply a *stable* fallback in the component body:
 *
 *   const raw = useStore((s) => s.map[id]); // undefined is Object.is-stable
 *   const value = raw ?? EMPTY_ARRAY;        // same frozen reference every render
 *
 * These singletons are frozen so an accidental mutation throws in development
 * instead of silently poisoning every consumer that shares the reference.
 */

/** Shared, frozen empty array. Use as a stable selector fallback. */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);

/** Shared, frozen empty object. Use as a stable selector fallback. */
export const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({});
