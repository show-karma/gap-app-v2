import type { LinkedAccountWithMetadata, User } from "@privy-io/react-auth";

/**
 * Privy linked-account types that represent a wallet rather than a standalone
 * identity. A session built only from these has nothing left to render — or to
 * authenticate with — once the wallet disconnects.
 */
const WALLET_ACCOUNT_TYPES = new Set(["wallet", "smart_wallet", "cross_app"]);

/**
 * Does the user have an identity that survives losing every connected wallet?
 *
 * Email, Google, Farcaster and other social logins keep the session meaningful
 * (the navbar still resolves a name/avatar, and the Privy token still identifies
 * the account) after the user disconnects a wallet they had merely linked.
 *
 * A wallet-only session has no such fallback: disconnecting the wallet in the
 * extension leaves an authenticated session with no address, no avatar and no
 * name — see `useAuth`'s disconnect handling.
 */
export const hasNonWalletIdentity = (user: User | null | undefined): boolean => {
  if (!user?.linkedAccounts) return false;
  return user.linkedAccounts.some(
    (account: LinkedAccountWithMetadata) => !WALLET_ACCOUNT_TYPES.has(account.type)
  );
};
