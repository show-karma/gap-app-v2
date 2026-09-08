import { useEffect, useSyncExternalStore } from "react";

/**
 * The handshake between the server-rendered activity feed twin and the
 * interactive client feed.
 *
 * The twin (`ActivityFeedStatic`) is rendered as a SIBLING of `UpdatesContent`
 * in the server tree, not as one of its props. `UpdatesContent` is a Client
 * Component that calls `useSearchParams()`, which aborts a prerender
 * unconditionally, and that abort covers its whole subtree — props included.
 * As a prop the twin therefore shipped only as flight data and never reached
 * the HTML, which is the crawlable content DEV-612 protects (E-7b names the
 * frame). As a sibling it lives above the abort and prerenders.
 *
 * The cost of that split is that the two halves can no longer see each other
 * through props, so the takeover travels through this module instead: the
 * client feed publishes when it has taken over, and the twin's slot stops
 * rendering. Deliberately one boolean and nothing else — the twin needs to know
 * "am I still the one on screen", not anything about the query behind it.
 */
let takenOver = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): boolean => takenOver;

/**
 * False on the server, always: the twin is what the initial HTML carries, and a
 * server snapshot of `true` would prerender the page without the very content
 * this split exists to keep.
 */
const getServerSnapshot = (): boolean => false;

/** Whether the interactive feed has taken over from the twin. */
export const useServerFeedTakenOver = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/**
 * Publishes the takeover. Called by the interactive feed with the condition
 * that used to hide the twin inline.
 *
 * Published from an effect rather than during render so the first client render
 * still reads `false` and matches the server's — the same reason the inline
 * version gated on a `hydrated` flag. Unmounting republishes `false`, so
 * navigating to another project starts from the twin again rather than from a
 * stale takeover.
 */
export const usePublishServerFeedTakeover = (hasTakenOver: boolean): void => {
  useEffect(() => {
    takenOver = hasTakenOver;
    emit();
  }, [hasTakenOver]);

  useEffect(() => {
    return () => {
      takenOver = false;
      emit();
    };
  }, []);
};

/** Test-only: forget a takeover left by a previous case. */
export const __resetServerFeedTakeoverForTests = (): void => {
  takenOver = false;
  emit();
};
