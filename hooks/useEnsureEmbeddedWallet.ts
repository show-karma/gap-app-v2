import { type User, useCreateWallet } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { wait } from "@/utilities/wait";

// Value of Privy's PrivyErrorCode.EMBEDDED_WALLET_ALREADY_EXISTS. Inlined because
// the enum is type-only in the runtime ESM build — importing it as a value crashes SSR.
const EMBEDDED_WALLET_ALREADY_EXISTS = "embedded_wallet_already_exists";

// Privy reports "already exists" in more than one shape across versions/builds:
// the structured `.code` property (authoritative), the human-readable
// "User already has an embedded wallet." in `.message` (what production throws),
// and — in some builds/tests — the raw code string inside `.message`. Detect all
// three so the idempotency guard never misses a benign already-exists race.
const ALREADY_EXISTS_MESSAGE_PATTERN =
  /already has an embedded wallet|embedded_wallet_already_exists/i;

const isEmbeddedWalletAlreadyExistsError = (error: unknown): boolean => {
  if ((error as { code?: string } | null)?.code === EMBEDDED_WALLET_ALREADY_EXISTS) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return ALREADY_EXISTS_MESSAGE_PATTERN.test(message);
};

/**
 * Module-level guard, keyed by Privy user id, claimed before the async create so
 * concurrent effect runs (React Strict Mode, remount, rapid re-render) within a
 * page session can't each launch a createWallet. NOTE: this is in-memory only,
 * so it does NOT survive Google's OAuth redirect (a full page reload wipes it) —
 * that is why the live `hasEmbeddedWallet` check and the settle window below, not
 * this Set, are what prevent the cross-reload duplicate.
 */
const creationAttemptedUserIds = new Set<string>();

const MAX_CREATE_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1000;

// A second embedded wallet can appear shortly after auth (e.g. one created in the
// pre-redirect context that hydrates after Google's OAuth reload). We wait this
// long before creating one ourselves so any existing wallet has time to appear —
// creating in that window is what produced the duplicate embedded wallets. If a
// wallet shows up during the wait, we create nothing.
export const SETTLE_BEFORE_CREATE_MS = 2500;

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
      // Another path (notably Privy's own auto-provisioning) already created the
      // wallet — this is idempotent success, not a transient failure. Short-circuit
      // the retry loop and report nothing.
      if (isEmbeddedWalletAlreadyExistsError(error)) return;

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
 * Waits for wallet state to settle, then creates an embedded wallet only if one
 * still hasn't appeared. `hasEmbeddedWalletRef`/`userRef` are read AFTER the
 * wait so a wallet that hydrates during the window (notably Privy's own
 * auto-created one) suppresses our creation and avoids a duplicate.
 */
const settleThenCreate = async (
  createWallet: () => Promise<unknown>,
  userId: string,
  hasEmbeddedWalletRef: { current: boolean },
  userRef: { current: User | null }
): Promise<void> => {
  await wait(SETTLE_BEFORE_CREATE_MS);

  // Auth context can change during the settle window: a logout (user → null) or
  // a switch to a different user. Never create a wallet for a session that is no
  // longer active — release the slot so the genuine user can be reconsidered.
  const currentUser = userRef.current;
  if (!currentUser || currentUser.id !== userId) {
    creationAttemptedUserIds.delete(userId);
    return;
  }

  if (hasEmbeddedWalletRef.current || userHasLinkedWallet(currentUser)) {
    // A wallet (Privy's auto-created one or another path's) showed up — don't
    // add a second. Slot stays claimed so we never reconsider for this user.
    return;
  }

  await createEmbeddedWalletWithRetry(createWallet, userId);
};

/**
 * Ensures a freshly authenticated user who has no wallet ends up with exactly
 * one embedded wallet, without ever minting a duplicate.
 *
 * Two creators can race here: Privy auto-provisions an embedded wallet for new
 * email/social signups, and this hook also creates one. The previous guard only
 * checked LINKED wallets (which hydrate late), so ~17% of email/Google signups
 * got two embedded wallets created 1–2s apart. We now (1) skip if a live
 * embedded wallet already exists and (2) wait for state to settle before
 * creating, re-checking once Privy's wallet has had time to appear.
 *
 * Lives in the always-mounted PrivyBridgeUpdater so it runs no matter where or
 * how the user logs in (navbar, deep link, modal, returning session).
 * `walletCount`/`hasEmbeddedWallet` re-trigger the check as wallets hydrate.
 */
export const useEnsureEmbeddedWallet = (
  ready: boolean,
  authenticated: boolean,
  user: User | null,
  walletCount: number,
  hasEmbeddedWallet: boolean
) => {
  const { createWallet } = useCreateWallet();

  // Latest live values, read inside the deferred create after the settle window.
  // Synced in an effect (not during render) so we never mutate a ref mid-render —
  // by the time settleThenCreate reads them (post-await) the last commit has run.
  const hasEmbeddedWalletRef = useRef(hasEmbeddedWallet);
  const userRef = useRef(user);
  useEffect(() => {
    hasEmbeddedWalletRef.current = hasEmbeddedWallet;
    userRef.current = user;
  });

  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    const userId = user.id;
    if (creationAttemptedUserIds.has(userId)) return;

    // Already has an embedded wallet (Privy's auto-created one or a prior run) or
    // a linked wallet (wallet-login user). Stale unlinked wallets are ignored.
    if (hasEmbeddedWallet || userHasLinkedWallet(user)) {
      creationAttemptedUserIds.add(userId);
      return;
    }

    // Claim the slot BEFORE awaiting so a second effect run (Strict Mode,
    // remount, rapid re-render) cannot launch a parallel createWallet().
    creationAttemptedUserIds.add(userId);

    void settleThenCreate(createWallet, userId, hasEmbeddedWalletRef, userRef);
  }, [ready, authenticated, user, walletCount, hasEmbeddedWallet, createWallet]);
};
