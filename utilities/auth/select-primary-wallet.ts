import type { User } from "@privy-io/react-auth";
import { compareAllWallets, getLinkedWalletAddresses } from "./compare-all-wallets";

/**
 * Choose the wallet that represents the authenticated user's identity and active
 * signer, from the full list of wallets Privy reports as connected in the browser.
 *
 * Privy's useWallets() lists EVERY physically-connected wallet, which can include
 * one left over from a previous session that is NOT linked to the current user —
 * notably MetaMask, which Privy cannot disconnect programmatically (its
 * wallet.disconnect() is a documented no-op). After logging out of a wallet session
 * and back in with email/social, that stale wallet is often wallets[0], so naively
 * using wallets[0] leaks the previous wallet's address/avatar and reads its on-chain
 * data.
 *
 * Rules:
 * - Prefer a connected wallet that is actually linked to the authenticated user.
 *   `compareAllWallets` covers every linked wallet (standard, smart, embedded,
 *   farcaster owner, cross-app), so an account with MULTIPLE linked wallets resolves
 *   to whichever linked wallet Privy lists first — which is wallets[0] (the active
 *   wallet) in the normal case, so the selection matches Privy's active wallet.
 * - If the user is authenticated AND has at least one linked wallet address but
 *   NONE of the connected wallets match, return `undefined` — never leak a foreign
 *   wallet's address as the user's identity. This is the flicker/ownership fix
 *   (issue #1574): an email/Google user mid-hydration with only a stale MetaMask
 *   connected must resolve to "no identity yet", not to the MetaMask.
 * - Fall back to wallets[0] ONLY in the pre-auth case: user is null/undefined, or
 *   the user has no linked wallet addresses yet (linkedAccounts not populated
 *   during hydration). This preserves wallet-login connect flows where a wallet
 *   connects moments before linkedAccounts refresh.
 *
 * Used by both useAuth (identity address) and PrivyWagmiProviders (the wallet synced
 * into the outer wagmi config that useAccount() reads) so the two never disagree.
 */
export const selectPrimaryWallet = <T extends { address: string }>(
  user: User | null | undefined,
  wallets: T[]
): T | undefined => {
  if (user) {
    const linkedWallet = wallets.find((w) => compareAllWallets(user, w.address));
    if (linkedWallet) return linkedWallet;
    // The user has linked wallets but none of the connected ones match — the
    // connected wallet(s) belong to someone else. Withhold an identity rather
    // than return a foreign address.
    if (getLinkedWalletAddresses(user).length > 0) return undefined;
  }
  return wallets[0];
};
