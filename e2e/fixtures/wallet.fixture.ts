import { test as base } from "@playwright/test";

/**
 * Configuration for the mock Ethereum wallet provider.
 */
export interface WalletConfig {
  /** Wallet address to return from eth_requestAccounts. Defaults to Hardhat account #0. */
  address: string;
  /** Chain ID as hex string. Defaults to "0xa" (Optimism mainnet). */
  chainId: string;
  /** Balance in wei as hex string. Defaults to 10 ETH. */
  balance: string;
}

const DEFAULT_WALLET_CONFIG: WalletConfig = {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  chainId: "0xa",
  balance: "0x8AC7230489E80000", // 10 ETH in wei
};

/**
 * Injects a mock EIP-1193 Ethereum provider into the page context via
 * `page.addInitScript()`. The provider responds to the JSON-RPC methods
 * that the frontend calls during wallet connection and chain switching.
 *
 * Supported methods:
 *  - eth_requestAccounts — returns the configured address
 *  - eth_chainId — returns the configured chain ID
 *  - eth_getBalance — returns the configured balance
 *  - wallet_switchEthereumChain — updates the internal chain ID
 *  - personal_sign — returns a deterministic mock signature
 *  - eth_accounts — returns the configured address
 *  - net_version — returns the chain ID as decimal
 *
 * The provider also exposes an `on`/`removeListener` interface so that
 * libraries like Wagmi/RainbowKit can subscribe to events.
 *
 * Must be called BEFORE navigating to any page.
 */
export async function injectMockWallet(
  page: import("@playwright/test").Page,
  overrides: Partial<WalletConfig> = {}
): Promise<WalletConfig> {
  const config: WalletConfig = { ...DEFAULT_WALLET_CONFIG, ...overrides };

  await page.addInitScript(
    (cfg: WalletConfig) => {
      let currentChainId = cfg.chainId;
      const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

      function emit(event: string, ...args: unknown[]) {
        const handlers = listeners[event] || [];
        for (const handler of handlers) {
          try {
            handler(...args);
          } catch {
            // Swallow listener errors in test mock
          }
        }
      }

      const provider = {
        isMetaMask: true,

        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return [cfg.address];

            case "eth_chainId":
              return currentChainId;

            case "net_version":
              return String(parseInt(currentChainId, 16));

            case "eth_getBalance":
              return cfg.balance;

            case "wallet_switchEthereumChain": {
              const requested = (params as Array<{ chainId: string }>)?.[0]?.chainId;
              if (requested) {
                currentChainId = requested;
                emit("chainChanged", currentChainId);
              }
              return null;
            }

            case "personal_sign": {
              // Return a deterministic 65-byte signature (r, s, v)
              return (
                "0x" +
                "a".repeat(64) + // r
                "b".repeat(64) + // s
                "1c" // v = 28
              );
            }

            default:
              throw new Error(`Mock provider: unsupported method "${method}"`);
          }
        },

        on: (event: string, handler: (...args: unknown[]) => void) => {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(handler);
        },

        removeListener: (event: string, handler: (...args: unknown[]) => void) => {
          const handlers = listeners[event];
          if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx >= 0) handlers.splice(idx, 1);
          }
        },

        removeAllListeners: () => {
          for (const key of Object.keys(listeners)) {
            delete listeners[key];
          }
        },
      };

      // Inject as window.ethereum (EIP-1193)
      Object.defineProperty(window, "ethereum", {
        value: provider,
        writable: false,
        configurable: true,
      });
    },
    config
  );

  return config;
}

/**
 * Playwright fixture that provides `withWallet` — a function to inject a mock
 * EIP-1193 provider into the current page context.
 *
 * Usage:
 * ```ts
 * import { test, expect } from "@e2e/fixtures";
 *
 * test("wallet connects", async ({ page, withWallet }) => {
 *   await withWallet({ address: "0x123..." });
 *   await page.goto("/");
 *   // ...assertions about connected wallet UI
 * });
 * ```
 */
export const walletFixture = base.extend<{
  withWallet: (overrides?: Partial<WalletConfig>) => Promise<WalletConfig>;
}>({
  withWallet: async ({ page }, use) => {
    await use((overrides?: Partial<WalletConfig>) => injectMockWallet(page, overrides));
  },
});
