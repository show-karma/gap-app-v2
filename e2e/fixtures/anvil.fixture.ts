import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { test as base } from "@playwright/test";

/**
 * Pinned block numbers for deterministic fork state.
 * Using pinned blocks ensures tests always see the same chain state regardless
 * of when they run, which prevents flaky assertions on balances, nonces, etc.
 */
export const PINNED_BLOCKS: Record<number, number> = {
  1: 19_000_000, // Ethereum mainnet
  10: 115_000_000, // Optimism
  42161: 180_000_000, // Arbitrum One
  137: 55_000_000, // Polygon PoS
  534352: 5_000_000, // Scroll
};

export interface AnvilConfig {
  /** Chain ID to fork. Defaults to 10 (Optimism). */
  chainId: number;
  /** RPC URL to fork from. Defaults to a public endpoint for the chain. */
  forkUrl?: string;
  /** Port for the Anvil RPC server. Defaults to 8545. */
  port: number;
  /** Number of pre-funded accounts. Defaults to 10. */
  accounts: number;
  /** Block number to pin the fork at. Looked up from PINNED_BLOCKS if not set. */
  forkBlockNumber?: number;
}

const DEFAULT_ANVIL_CONFIG: AnvilConfig = {
  chainId: 10,
  port: 8545,
  accounts: 10,
};

/**
 * Default public RPC endpoints keyed by chain ID.
 * These are free/public endpoints suitable for forking in CI.
 */
const PUBLIC_RPC: Record<number, string> = {
  1: "https://eth.llamarpc.com",
  10: "https://mainnet.optimism.io",
  42161: "https://arb1.arbitrum.io/rpc",
  137: "https://polygon-rpc.com",
  534352: "https://rpc.scroll.io",
};

/**
 * Start an Anvil process that forks a live network at a pinned block.
 *
 * Returns the child process handle and the RPC URL for the local fork.
 * The caller is responsible for killing the process when done (the fixture
 * handles this automatically).
 */
export async function startAnvil(
  overrides: Partial<AnvilConfig> = {}
): Promise<{ process: ChildProcess; rpcUrl: string; config: AnvilConfig }> {
  const config: AnvilConfig = { ...DEFAULT_ANVIL_CONFIG, ...overrides };
  const forkUrl = config.forkUrl ?? PUBLIC_RPC[config.chainId];

  if (!forkUrl) {
    throw new Error(
      `No RPC URL for chain ${config.chainId}. Pass forkUrl explicitly or add to PUBLIC_RPC.`
    );
  }

  const forkBlock = config.forkBlockNumber ?? PINNED_BLOCKS[config.chainId];

  const args = [
    "--fork-url",
    forkUrl,
    "--port",
    String(config.port),
    "--accounts",
    String(config.accounts),
    "--chain-id",
    String(config.chainId),
    "--silent",
  ];

  if (forkBlock !== undefined) {
    args.push("--fork-block-number", String(forkBlock));
  }

  const child = spawn("anvil", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const rpcUrl = `http://127.0.0.1:${config.port}`;

  // Wait for Anvil to be ready by polling the RPC endpoint
  await waitForAnvilReady(rpcUrl, 30_000);

  return { process: child, rpcUrl, config };
}

/**
 * Poll the Anvil RPC endpoint until it responds to eth_chainId,
 * or throw after the timeout.
 */
async function waitForAnvilReady(rpcUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      });
      if (response.ok) {
        const json = (await response.json()) as { result?: string };
        if (json.result) return;
      }
    } catch {
      // Anvil not ready yet, retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Anvil did not become ready at ${rpcUrl} within ${timeoutMs}ms`);
}

/**
 * Take an EVM snapshot via the Anvil `evm_snapshot` RPC method.
 * Returns the snapshot ID (hex string) used for reverting.
 */
export async function takeSnapshot(rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "evm_snapshot", params: [], id: 1 }),
  });
  const json = (await response.json()) as { result: string };
  return json.result;
}

/**
 * Revert the EVM state to a previous snapshot via `evm_revert`.
 * After reverting, the snapshot is consumed — take a new one for
 * subsequent tests.
 */
export async function revertSnapshot(rpcUrl: string, snapshotId: string): Promise<boolean> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "evm_revert",
      params: [snapshotId],
      id: 1,
    }),
  });
  const json = (await response.json()) as { result: boolean };
  return json.result;
}

/**
 * Playwright fixture that manages an Anvil fork process with automatic
 * snapshot/revert per test.
 *
 * The fixture:
 * 1. Starts Anvil before the first test in the worker
 * 2. Takes a snapshot before each test
 * 3. Reverts to the snapshot after each test
 * 4. Kills the Anvil process when the worker shuts down
 *
 * Usage:
 * ```ts
 * import { test } from "@e2e/fixtures";
 *
 * test("on-chain interaction", async ({ page, anvil }) => {
 *   // anvil.rpcUrl is available for page.addInitScript or API mocking
 *   // State is automatically reverted after this test
 * });
 * ```
 */
export const anvilFixture = base.extend<
  {
    anvil: { rpcUrl: string; config: AnvilConfig };
  },
  {
    _anvilWorker: { process: ChildProcess; rpcUrl: string; config: AnvilConfig };
  }
>({
  // Worker-scoped: one Anvil process per worker
  _anvilWorker: [
    async ({}, use) => {
      const instance = await startAnvil();
      await use(instance);
      instance.process.kill("SIGTERM");
    },
    { scope: "worker" },
  ],

  // Test-scoped: snapshot before, revert after
  anvil: async ({ _anvilWorker }, use) => {
    const snapshotId = await takeSnapshot(_anvilWorker.rpcUrl);
    await use({ rpcUrl: _anvilWorker.rpcUrl, config: _anvilWorker.config });
    await revertSnapshot(_anvilWorker.rpcUrl, snapshotId);
  },
});
