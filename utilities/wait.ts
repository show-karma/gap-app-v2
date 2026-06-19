/**
 * Resolve after `ms` milliseconds. Small shared helper so timing-sensitive
 * flows (retry backoff, chain-switch polling) don't each re-implement a
 * setTimeout-wrapped promise.
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
