import { ConnectorNotConnectedError, getAccount, getWalletClient, reconnect } from "@wagmi/core";
import { errorManager } from "@/components/Utilities/errorManager";
import { privyConfig as config } from "./wagmi/privy-config";

const CONNECT_RETRIES = 5;
const CONNECT_RETRY_DELAY_MS = 500;

/**
 * Detects the transient "connector not connected" condition.
 * During startup Privy and wagmi initialize independently, so the wagmi
 * connector can briefly be disconnected while Privy already reports the user
 * as authenticated. `getWalletClient` throws `ConnectorNotConnectedError` in
 * that window. This is an expected startup race the user never sees, not a
 * genuine wallet failure, so it must not be reported to Sentry.
 */
const isConnectorNotConnectedError = (error: unknown): boolean =>
  error instanceof ConnectorNotConnectedError;

/**
 * Ensures the wagmi connector is connected, reconnecting and polling if needed.
 * Returns true once the account reaches the "connected" status, false if it
 * never connects within the bounded retry window.
 */
const ensureConnectorConnected = async (): Promise<boolean> => {
  if (getAccount(config).status === "connected") {
    return true;
  }

  // The connector is not connected yet (Privy↔wagmi startup race or a stale
  // connector after a chain switch). Force wagmi to re-establish connector
  // state, then poll until it reports connected.
  try {
    await reconnect(config);
  } catch {
    // Reconnect can fail if already connected/connecting — safe to ignore;
    // the poll below verifies the final state.
  }

  let retries = CONNECT_RETRIES;
  while (retries > 0 && getAccount(config).status !== "connected") {
    await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
    retries--;
  }

  return getAccount(config).status === "connected";
};

/**
 * Safely gets a wallet client with error handling for common issues.
 *
 * Guards on connector connection state before acquiring the client: during the
 * Privy↔wagmi startup race the connector may not be connected yet, which makes
 * `getWalletClient` throw `ConnectorNotConnectedError`. That is a transient
 * startup condition, so it is reconnected/polled for and, if it never resolves,
 * returned as a typed not-connected result without reporting to Sentry.
 *
 * After a chain switch, the wagmi wallet client cache can be stale. This
 * function reconnects and retries if the returned client is on the wrong chain.
 *
 * @param chainId The chain ID to connect to
 * @param showToast Whether to show toast messages for errors (default: false)
 * @param setLoadingState Optional function to update loading state on error
 * @returns Object with wallet client (if successful) and error message (if failed)
 */
export const safeGetWalletClient = async (
  chainId: number,
  _showToast: boolean = false,
  setLoadingState?: (state: boolean) => void
): Promise<{
  walletClient: Awaited<ReturnType<typeof getWalletClient>> | null;
  error: string | null;
}> => {
  // Wait for the connector before acquiring a client so we never throw
  // ConnectorNotConnectedError during the Privy↔wagmi startup race.
  const connected = await ensureConnectorConnected();
  if (!connected) {
    // Transient startup condition the user never sees — do NOT report to Sentry.
    if (setLoadingState) {
      setLoadingState(false);
    }
    return {
      walletClient: null,
      error: "Failed to connect to wallet. Please try again.",
    };
  }

  try {
    let walletClient = await getWalletClient(config, {
      chainId,
    });

    if (!walletClient) {
      throw new Error("Error getting wallet client");
    }

    // Verify the wallet client is on the expected chain.
    // After a chain switch, wagmi's cache may still return a stale client.
    if (walletClient.chain?.id !== chainId) {
      // Force wagmi to re-establish connector state, flushing stale cache
      try {
        await reconnect(config);
      } catch {
        // Reconnect can fail if already connected — safe to ignore
      }

      let retries = CONNECT_RETRIES;
      while (retries > 0 && walletClient.chain?.id !== chainId) {
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
        walletClient = await getWalletClient(config, { chainId });
        retries--;
      }

      if (walletClient.chain?.id !== chainId) {
        throw new Error(
          `Wallet is on chain ${walletClient.chain?.id} but expected ${chainId}. Please switch your wallet network and try again.`
        );
      }
    }

    return { walletClient, error: null };
  } catch (error: unknown) {
    if (setLoadingState) {
      setLoadingState(false);
    }

    // The connector can disconnect again between the guard above and the call
    // (or mid-retry). This is the same transient startup race, not a genuine
    // failure, so it must not be reported to Sentry.
    if (isConnectorNotConnectedError(error)) {
      return {
        walletClient: null,
        error: "Failed to connect to wallet. Please try again.",
      };
    }

    // Use errorManager to track genuine errors (wrong chain after reconnect,
    // real provider failures).
    errorManager("Wallet client error", error, { chainId });

    const errorMsg =
      error instanceof Error && error.message.includes("expected")
        ? error.message
        : "Failed to connect to wallet. Please try again.";

    return {
      walletClient: null,
      error: errorMsg,
    };
  }
};
