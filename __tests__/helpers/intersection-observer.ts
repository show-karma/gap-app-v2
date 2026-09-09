import { afterEach, beforeEach } from "vitest";

/**
 * The global test setup installs an IntersectionObserver that never reports
 * an intersection, which is right for most components and wrong for one
 * whose whole job is to wait for it. Tests of the notebook frame call this
 * so the slot is reported visible at once; the deferred-mount tests replace
 * it again with a hand-driven observer.
 */
export function useIntersectingObserver() {
  let previous: typeof globalThis.IntersectionObserver;

  beforeEach(() => {
    previous = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      private readonly callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof globalThis.IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = previous;
  });
}
