import { custom } from "viem";

export type FailureMode =
  | "timeout"
  | "network-error"
  | "gas-estimation-error"
  | "nonce-too-low"
  | "revert"
  | "quota-exceeded"
  | "rate-limit";

export interface FailureConfig {
  /** RPC method to intercept, e.g. 'eth_sendTransaction', 'eth_estimateGas' */
  method: string;
  /** The type of failure to simulate */
  failure: FailureMode;
  /** Delay in ms before throwing (used for timeout simulation) */
  delayMs?: number;
}

/**
 * Creates a viem custom transport that simulates RPC failures for specified methods.
 * Methods not in the failure list pass through and return null.
 */
export function createFailingTransport(failures: FailureConfig[]) {
  const failureMap = new Map(failures.map((f) => [f.method, f]));

  return custom({
    async request({ method }: { method: string }) {
      const failure = failureMap.get(method);
      if (!failure) return null;

      switch (failure.failure) {
        case "timeout":
          await new Promise((r) => setTimeout(r, failure.delayMs ?? 30_000));
          throw new Error("Request timed out");
        case "network-error":
          throw new Error("Failed to fetch");
        case "gas-estimation-error":
          throw new Error("execution reverted: gas estimation failed");
        case "nonce-too-low":
          throw new Error("nonce too low");
        case "revert":
          throw new Error("execution reverted");
        case "quota-exceeded":
          throw new Error("relay quota exceeded");
        case "rate-limit":
          throw Object.assign(new Error("Too Many Requests"), { code: 429 });
      }
    },
  });
}
