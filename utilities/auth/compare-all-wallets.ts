import type { LinkedAccountWithMetadata, User } from "@privy-io/react-auth";
import { isAddress } from "viem";

type WalletLike = { address: string };

/**
 * Check if a given address matches any wallet linked to the Privy user,
 * including standard wallets, smart wallets, and cross-app embedded wallets.
 */
export const compareAllWallets = (user: User, address: string): boolean => {
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

  return wallets.some((wallet) => wallet.toLowerCase() === address.toLowerCase());
};
