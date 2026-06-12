import { type User, useCreateWallet } from "@privy-io/react-auth";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";

// Value of Privy's PrivyErrorCode.EMBEDDED_WALLET_ALREADY_EXISTS. Inlined because
// the enum is type-only in the runtime ESM build — importing it as a value crashes SSR.
const EMBEDDED_WALLET_ALREADY_EXISTS = "embedded_wallet_already_exists";

/**
 * Module-level guard, keyed by Privy user id. Survives component remounts and
 * React Strict Mode's double-invoked effects within a page session, so the
 * embedded-wallet creation is attempted at most once per user — never twice
 * concurrently. This is what prevents the duplicate-wallet bug: Privy's own
 * `createOnLogin` auto-creation re-evaluates "user without wallet" on every
 * provider initialization and mints a second wallet before the first persists.
 */
const creationAttemptedUserIds = new Set<string>();

const MAX_CREATE_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1000;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Create the embedded wallet, retrying transient failures with exponential
 * backoff. The slot stays claimed across retries so no parallel creation can
 * start. Only after all attempts are exhausted is the slot released (so a later
 * remount or auth-state change can try again) and the failure surfaced.
 */
const createEmbeddedWalletWithRetry = async (
  createWallet: () => Promise<unknown>,
  userId: string
): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      await createWallet();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Another path already created the wallet — treat as success.
      if (message.includes(EMBEDDED_WALLET_ALREADY_EXISTS)) return;

      if (attempt === MAX_CREATE_ATTEMPTS) {
        creationAttemptedUserIds.delete(userId);
        errorManager("Failed to create embedded wallet on login", error, {
          userId,
          attempts: attempt,
        });
        return;
      }
      await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
};

// Match Privy's "users-without-wallets": the decision is based ONLY on wallets
// LINKED to the account, never on physically-connected ones. A stale MetaMask
// left connected from a previous session is in useWallets() but not linked — it
// must not suppress embedded-wallet creation, or the email user is left with the
// stale wallet as their active signer/identity.
const userHasLinkedWallet = (user: User): boolean => getLinkedWalletAddresses(user).length > 0;

/**
 * Creates exactly one Privy embedded wallet for a freshly authenticated user
 * who has no linked wallet, replacing the SDK's `createOnLogin: "users-without-wallets"`
 * (which double-fires and creates two wallets — see fix/privy-duplicate-embedded-wallet).
 *
 * Lives in the always-mounted PrivyBridgeUpdater so it runs no matter where or
 * how the user logs in (navbar, deep link, modal, returning session). `walletCount`
 * re-triggers the check once the new embedded wallet appears so the guard settles.
 */
export const useEnsureEmbeddedWallet = (
  ready: boolean,
  authenticated: boolean,
  user: User | null,
  walletCount: number
) => {
  const { createWallet } = useCreateWallet();

  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    const userId = user.id;
    if (creationAttemptedUserIds.has(userId)) return;

    // A wallet-login user already has a linked wallet and must not get an extra
    // embedded wallet. Stale connected-but-unlinked wallets are ignored.
    if (userHasLinkedWallet(user)) {
      creationAttemptedUserIds.add(userId);
      return;
    }

    // Claim the slot BEFORE awaiting so a second effect run (Strict Mode,
    // remount, rapid re-render) cannot launch a parallel createWallet().
    creationAttemptedUserIds.add(userId);

    void createEmbeddedWalletWithRetry(createWallet, userId);
  }, [ready, authenticated, user, walletCount, createWallet]);
};
