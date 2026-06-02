import type { LinkedAccountWithMetadata, User } from "@privy-io/react-auth";
import { isAddress } from "viem";

type WalletLike = { address: string };

/**
 * Collect EVERY wallet address linked to the Privy user — standard wallets,
 * smart wallets, the Farcaster owner address, and cross-app embedded + smart
 * wallets.
 *
 * A single Privy account can carry MORE THAN ONE wallet (e.g. two embedded
 * wallets), only one of which is the "active" signer at a time. Callers that
 * authorize the *account* rather than the active signer must consider all of
 * them, or the account silently loses access whenever Privy surfaces a
 * different wallet as the active one.
 */
export const getLinkedWalletAddresses = (user: User): string[] => {
  if (!user.linkedAccounts) return [];
  const wallets: string[] = [];

  user.linkedAccounts.forEach((account: LinkedAccountWithMetadata) => {
    if (account.type === "wallet") {
      wallets.push(account.address);
      return;
    }
    if (account.type === "smart_wallet") {
      wallets.push(account.address);
      return;
    }
    if (account.type === "farcaster") {
      const ownerAddress = (account as unknown as { ownerAddress?: string }).ownerAddress;
      if (ownerAddress && isAddress(ownerAddress)) {
        wallets.push(ownerAddress);
      }
      return;
    }
    if (account.type === "cross_app") {
      const crossAppWallets: WalletLike[] = (account.embeddedWallets as WalletLike[]).concat(
        account.smartWallets as WalletLike[]
      );
      crossAppWallets.forEach((wallet) => {
        if (isAddress(wallet.address)) {
          wallets.push(wallet.address);
        }
      });
    }
  });

  return wallets;
};

/**
 * Check if a given address matches any wallet linked to the Privy user,
 * including standard wallets, smart wallets, and cross-app embedded wallets.
 */
export const compareAllWallets = (user: User, address: string): boolean =>
  getLinkedWalletAddresses(user).some((wallet) => wallet.toLowerCase() === address.toLowerCase());
