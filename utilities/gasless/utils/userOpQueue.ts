/**
 * Serializes UserOperation submissions per smart-account sender.
 *
 * ERC-4337 accounts advance their nonce only once a UserOperation is included.
 * Firing two operations for the same sender before the first is mined makes
 * both read the same nonce, and the bundler rejects the second with
 * `AA25 invalid account nonce: Another UserOperation with same sender and nonce
 * is already being processed`.
 *
 * The app builds a fresh smart-account client per transaction, so a per-client
 * lock can't span concurrent operations. This queue lives at module scope,
 * keyed by sender address, so it serializes ops across those independent
 * clients (and across unrelated UI components that each fire their own tx).
 */

const tails = new Map<string, Promise<unknown>>();

const keyFor = (sender: string | undefined): string => (sender ?? "unknown").toLowerCase();

/**
 * Runs `task` only after every previously queued op for `sender` has settled.
 * The stored tail never rejects, so a failed op delays — but does not poison —
 * the next one. The caller still receives the task's real result or error.
 */
export function serializeBySender<T>(
  sender: string | undefined,
  task: () => Promise<T>
): Promise<T> {
  const key = keyFor(sender);
  const prev = tails.get(key) ?? Promise.resolve();

  const run = prev.then(() => task());

  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  tail.finally(() => {
    // Drop the slot when this op is the last one queued, so the map doesn't
    // grow unbounded over a long session.
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  });

  return run;
}

type Eip1193Like = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

/**
 * Wraps an EIP-1193 provider so `eth_sendTransaction` calls are serialized per
 * sender via {@link serializeBySender}. All other methods pass through
 * untouched (including any event emitter surface), so vendor providers like
 * ZeroDev's `KernelEIP1193Provider` keep working as-is.
 */
export function withUserOpSerialization<P extends Eip1193Like>(
  provider: P,
  sender: string | undefined
): P {
  const originalRequest = provider.request.bind(provider);

  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "request") {
        return (args: { method: string; params?: unknown }) => {
          if (args?.method === "eth_sendTransaction") {
            return serializeBySender(sender, () => originalRequest(args));
          }
          return originalRequest(args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
