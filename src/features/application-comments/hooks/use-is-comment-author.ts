"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

/**
 * Hook to determine if the current user is the author of a comment.
 * Uses compareAllWallets to support Farcaster multi-wallet users.
 * @param authorAddress - The wallet address of the comment author
 * @returns boolean indicating whether the current user is the author
 */
export function useIsCommentAuthor(authorAddress: string): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !authorAddress) {
      return false;
    }
    return compareAllWallets(user, authorAddress);
  }, [user, authorAddress]);
}
