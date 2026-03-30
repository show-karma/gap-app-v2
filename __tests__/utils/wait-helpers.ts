/**
 * Flushes pending microtasks / promises by yielding to the event loop once.
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Polls `check()` until it returns `true`, or throws after `timeout` ms.
 */
export async function waitForCondition(
  check: () => boolean,
  { timeout = 5000, interval = 50 } = {}
): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) {
      throw new Error("Condition not met within timeout");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}
