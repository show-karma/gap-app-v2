import { hexToBigInt } from "viem";
import { reportClientError } from "@/utilities/clientErrorReport";

const STUCK_NONCE_PATTERN = /AA25/i;
const MAX_NONCE_KEY = 0xffff;

type Eip1193Like = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

type EthTransaction = {
  to?: `0x${string}`;
  data?: `0x${string}`;
  value?: `0x${string}`;
  from?: string;
  gas?: string;
};

type SendableClient = {
  account?: { getNonce?: (args?: { key?: bigint }) => Promise<bigint> };
  sendTransaction: (tx: Record<string, unknown>) => Promise<`0x${string}`>;
};

export interface StuckNonceRecoveryOptions {
  client: SendableClient;
  chainId: number;
  alternateClients: Array<{ label: string; build: () => SendableClient }>;
}

const collectMessages = (error: unknown, depth = 0, seen = new Set<unknown>()): string[] => {
  if (!error || typeof error !== "object" || depth > 5 || seen.has(error)) {
    return typeof error === "string" ? [error] : [];
  }
  seen.add(error);
  const record = error as Record<string, unknown>;
  const own = typeof record.message === "string" ? [record.message] : [];
  const nested = ["cause", "error", "info", "details", "data"].flatMap((key) =>
    collectMessages(record[key], depth + 1, seen)
  );
  return [...own, ...nested];
};

/**
 * True when the bundler refused the op because another op with the same sender
 * and nonce is still sitting in its mempool.
 */
export const isStuckNonceError = (error: unknown): boolean =>
  collectMessages(error).some((message) => STUCK_NONCE_PATTERN.test(message));

const toKernelTx = (tx: EthTransaction): Record<string, unknown> => ({
  ...tx,
  value: tx.value ? hexToBigInt(tx.value) : undefined,
});

const randomNonceKey = (): bigint => BigInt(1 + Math.floor(Math.random() * MAX_NONCE_KEY));

/**
 * Recovers from a mempool-stuck nonce in two stages: resend the same op through
 * a bundler with its own mempool (consuming the blocked nonce on-chain), then,
 * if every alternate also refuses, resend under a fresh 2D nonce key so the
 * user is no longer blocked by the ghost op.
 */
export async function recoverStuckNonce(
  tx: EthTransaction,
  originalError: unknown,
  options: StuckNonceRecoveryOptions
): Promise<`0x${string}`> {
  const kernelTx = toKernelTx(tx);
  const sender = tx.from;

  for (const alternate of options.alternateClients) {
    try {
      const hash = await alternate.build().sendTransaction(kernelTx);
      reportClientError("[ZeroDev] Recovered stuck nonce via alternate bundler", originalError, {
        chainId: options.chainId,
        sender,
        bundler: alternate.label,
      });
      return hash;
    } catch (error) {
      if (!isStuckNonceError(error)) {
        throw error;
      }
    }
  }

  const getNonce = options.client.account?.getNonce;
  if (!getNonce) {
    throw originalError;
  }

  const key = randomNonceKey();
  const nonce = await getNonce({ key });
  const hash = await options.client.sendTransaction({ ...kernelTx, nonce });
  reportClientError("[ZeroDev] Recovered stuck nonce via fresh nonce key", originalError, {
    chainId: options.chainId,
    sender,
    nonceKey: key.toString(),
  });
  return hash;
}

/**
 * Wraps an EIP-1193 provider so an `eth_sendTransaction` rejected with AA25 is
 * retried through {@link recoverStuckNonce}. Every other method passes through.
 */
export function withStuckNonceRecovery<P extends Eip1193Like>(
  provider: P,
  options: StuckNonceRecoveryOptions
): P {
  const originalRequest = provider.request.bind(provider);

  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "request") {
        return async (args: { method: string; params?: unknown }) => {
          if (args?.method !== "eth_sendTransaction") {
            return originalRequest(args);
          }
          try {
            return await originalRequest(args);
          } catch (error) {
            if (!isStuckNonceError(error)) {
              throw error;
            }
            const [tx] = (args.params as [EthTransaction]) ?? [];
            return recoverStuckNonce(tx, error, options);
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
