import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { resolveSigningWallets } from "@/utilities/auth/resolve-signing-wallets";
import { wait } from "@/utilities/wait";
import { SignerUnavailableError } from "@/utilities/wallet/signerReadiness";

/** Snapshot of the auth/wallet state, kept fresh via a ref so a wait loop that
 *  started during hydration can observe wallets that arrive later. */
export interface WalletStateSnapshot {
  privyReady: boolean;
  walletsReady: boolean;
  user: User | null;
  wallets: ConnectedWallet[];
}

export interface UsableWalletState {
  embeddedWallet: ConnectedWallet | null;
  externalWallet: ConnectedWallet | null;
  signingMode: "embedded" | "external" | "none";
}

/**
 * Which of the resolved (linked-only) wallets can actually produce a signer
 * for the given signing mode. Embedded-mode users prefer the embedded wallet
 * but may fall back to a LINKED external wallet (Farcaster users never get an
 * embedded wallet; hybrid email+wallet accounts may sign with their own
 * MetaMask). External-mode users need their linked external wallet — an
 * embedded wallet can't sign for them (the gasless/embedded signing paths
 * require the embedded signing mode).
 */
export function selectUsableWallet({
  embeddedWallet,
  externalWallet,
  signingMode,
}: UsableWalletState): ConnectedWallet | null {
  if (signingMode === "embedded") return embeddedWallet ?? externalWallet;
  if (signingMode === "external") return externalWallet;
  return null;
}

// Covers the wallet-hydration race (~1-2s) plus the embedded-wallet settle
// window (2.5s, see useEnsureEmbeddedWallet.SETTLE_BEFORE_CREATE_MS) and its
// first creation attempt. Runs under the "Creating project..." attestation
// toast, so the user sees progress rather than a hang. Do not go below ~5s
// or fresh-signup flows (new email/social users) regress.
export const WALLET_READY_TIMEOUT_MS = 8_000;
const WALLET_READY_POLL_MS = 250;

/**
 * Waits for a usable wallet to appear, polling the live (ref-backed) auth
 * state so a call that starts mid-hydration can still resolve once Privy
 * finishes. Classifies the reason if the wait times out instead of throwing
 * a generic "no wallet" error.
 *
 * Wallet selection goes through resolveSigningWallets, so only wallets LINKED
 * to the authenticated user are ever considered usable — a stale foreign
 * MetaMask can never satisfy this wait, no matter how long it stays connected
 * (issue #1574 invariant).
 */
export async function waitForUsableWallet(stateRef: {
  current: WalletStateSnapshot;
}): Promise<UsableWalletState> {
  const deadline = Date.now() + WALLET_READY_TIMEOUT_MS;

  while (true) {
    const { walletsReady, user, wallets } = stateRef.current;
    const resolved = resolveSigningWallets(user, wallets);

    if (selectUsableWallet(resolved)) {
      return resolved;
    }

    if (Date.now() >= deadline) {
      if (!walletsReady) throw new SignerUnavailableError("wallets-hydrating");
      if (resolved.signingMode === "embedded") {
        throw new SignerUnavailableError("embedded-wallet-provisioning");
      }
      throw new SignerUnavailableError("no-wallet-connected");
    }

    await wait(WALLET_READY_POLL_MS);
  }
}
