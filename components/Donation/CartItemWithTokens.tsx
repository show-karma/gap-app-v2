"use client";

import { useMemo } from "react";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";
import { shortAddress } from "@/utilities/shortAddress";
import { CartItemRow } from "./CartItemRow";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
  imageURL?: string;
}

interface CartItemWithTokensProps {
  item: CartItem;
  chainPayoutAddress?: ChainPayoutAddressMap;
  selectedToken?: SupportedToken;
  currentAmount: string;
  allAvailableTokens: SupportedToken[];
  balanceByTokenKey: Record<string, string>;
  onTokenSelect: (token: SupportedToken) => void;
  onAmountChange: (amount: string) => void;
  onRemove: () => void;
}

/**
 * Wrapper component that handles token filtering logic per cart item.
 * Filters available tokens based on the project's configured chainPayoutAddress.
 */
export function CartItemWithTokens({
  item,
  chainPayoutAddress,
  selectedToken,
  currentAmount,
  allAvailableTokens,
  balanceByTokenKey,
  onTokenSelect,
  onAmountChange,
  onRemove,
}: CartItemWithTokensProps) {
  // Memoize configured chain IDs from project's chainPayoutAddress
  const configuredChainIds = useMemo(() => {
    if (!chainPayoutAddress) return [];
    return Object.keys(chainPayoutAddress).map(Number);
  }, [chainPayoutAddress]);

  // Filter tokens by configured chains and include selected token if not in list
  const tokenOptions = useMemo(() => {
    // Filter by configured chains
    const projectTokens = allAvailableTokens.filter((token) =>
      configuredChainIds.includes(token.chainId)
    );

    // Include selected token if not in filtered list (edge case - token was selected before)
    if (
      selectedToken &&
      !projectTokens.some(
        (t) => t.symbol === selectedToken.symbol && t.chainId === selectedToken.chainId
      )
    ) {
      return [...projectTokens, selectedToken];
    }

    return projectTokens;
  }, [allAvailableTokens, configuredChainIds, selectedToken]);

  const isMissingPayout = configuredChainIds.length === 0;

  // Build payoutInfo for the selected token's chain
  const payoutInfo = useMemo(() => {
    if (!selectedToken || !chainPayoutAddress) {
      return undefined;
    }
    const address = chainPayoutAddress[selectedToken.chainId.toString()];
    return {
      address,
      isLoading: false,
      isMissing: !address,
    };
  }, [selectedToken, chainPayoutAddress]);

  return (
    <CartItemRow
      item={item}
      selectedToken={selectedToken}
      currentAmount={currentAmount}
      tokenOptions={tokenOptions}
      isMissingPayout={isMissingPayout}
      payoutInfo={payoutInfo}
      formatAddress={shortAddress}
      balanceByTokenKey={balanceByTokenKey}
      onTokenSelect={onTokenSelect}
      onAmountChange={onAmountChange}
      onRemove={onRemove}
    />
  );
}
