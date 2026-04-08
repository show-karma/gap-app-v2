import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getNativeTokenSymbol, NATIVE_TOKEN_ADDRESS, TOKEN_ADDRESSES } from "@/config/tokens";
import { payoutDisbursementKeys } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import * as payoutService from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";

/**
 * Resolves a token symbol from a payout config's tokenAddress and chainID.
 * Falls back to grant-level currency, then "$".
 */
export function resolveTokenSymbol(
  config: PayoutGrantConfig,
  grantCurrency?: string
): string | undefined {
  // 1. Try grant-level currency (from community milestones API)
  if (grantCurrency) return grantCurrency;

  const { tokenAddress, chainID } = config;
  if (!tokenAddress || !chainID) return undefined;

  // 2. Check if it's a known USDC address
  const normalizedAddress = tokenAddress.toLowerCase();
  const usdcEntries = Object.entries(TOKEN_ADDRESSES.usdc) as [string, string][];
  for (const [, address] of usdcEntries) {
    if (address.toLowerCase() === normalizedAddress) {
      return "USDC";
    }
  }

  // 3. Check if it's the native token sentinel address
  if (normalizedAddress === NATIVE_TOKEN_ADDRESS.toLowerCase()) {
    return getNativeTokenSymbol(chainID);
  }

  return undefined;
}

/**
 * Pure helper: builds a milestoneUID → formatted amount map from payout configs.
 * Resolves token symbols from the payout config's tokenAddress/chainID or
 * from a grant-level currencyByGrant map.
 * Exported for unit testing.
 */
export function buildMilestoneAllocationMap(
  configs: (PayoutGrantConfig | null | undefined)[],
  currencyByGrant?: Map<string, string>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const config of configs) {
    if (!config) continue;
    const grantCurrency = currencyByGrant?.get(config.grantUID);
    const tokenSymbol = resolveTokenSymbol(config, grantCurrency);
    for (const allocation of config.milestoneAllocations ?? []) {
      if (allocation.milestoneUID && allocation.amount) {
        const formatted = formatMilestoneAmount(allocation.amount, tokenSymbol);
        if (formatted) {
          map.set(allocation.milestoneUID, formatted);
        }
      }
    }
  }

  return map;
}

/**
 * Pure helper: builds a grantUID → total formatted amount map from payout configs.
 * Sums all milestone allocations per grant.
 * Exported for unit testing.
 */
export function buildGrantAllocationTotalMap(
  configs: (PayoutGrantConfig | null | undefined)[],
  currencyByGrant?: Map<string, string>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const config of configs) {
    if (!config) continue;
    const grantCurrency = currencyByGrant?.get(config.grantUID);
    const tokenSymbol = resolveTokenSymbol(config, grantCurrency);

    let total = 0;
    for (const allocation of config.milestoneAllocations ?? []) {
      if (allocation.amount) {
        const parts = allocation.amount.trim().split(/\s+/);
        const numericStr = parts[0].replace(/[$,]/g, "");
        const numericValue = Number(numericStr);
        if (!Number.isNaN(numericValue)) {
          total += numericValue;
        }
      }
    }

    if (total > 0) {
      const formatted = formatMilestoneAmount(String(total), tokenSymbol);
      if (formatted) {
        map.set(config.grantUID, formatted);
      }
    }
  }

  return map;
}

/**
 * Generic hook: fetches payout configs for given grant UIDs
 * and returns both milestone-level and grant-level allocation maps.
 */
export function useMilestoneAllocationsByGrants(
  grantUIDs: string[],
  currencyByGrant?: Map<string, string>
) {
  const queries = useQueries({
    queries: grantUIDs.map((grantUID) => ({
      queryKey: [...payoutDisbursementKeys.payoutConfigs.byGrant(grantUID), "public"] as const,
      queryFn: () => payoutService.getPayoutConfigByGrantPublic(grantUID),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const dataKey = useMemo(() => queries.map((q) => q.dataUpdatedAt).join(","), [queries]);

  const allocationMap = useMemo(() => {
    return buildMilestoneAllocationMap(
      queries.map((q) => q.data),
      currencyByGrant
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, currencyByGrant]);

  const grantTotalMap = useMemo(() => {
    return buildGrantAllocationTotalMap(
      queries.map((q) => q.data),
      currencyByGrant
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, currencyByGrant]);

  return { allocationMap, grantTotalMap, isLoading };
}

/**
 * Fetches payout configs for all unique grants in the milestone list
 * and returns a milestoneUID → formatted amount map.
 */
export function useCommunityMilestoneAllocations(milestones: CommunityMilestoneUpdate[]) {
  const uniqueGrantUIDs = useMemo(() => {
    const uids = new Set<string>();
    for (const m of milestones) {
      if (m.grant?.uid) {
        uids.add(m.grant.uid);
      }
    }
    return Array.from(uids);
  }, [milestones]);

  const currencyByGrant = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of milestones) {
      if (m.grant?.uid && m.grant.details?.currency) {
        map.set(m.grant.uid, m.grant.details.currency);
      }
    }
    return map;
  }, [milestones]);

  const queries = useQueries({
    queries: uniqueGrantUIDs.map((grantUID) => ({
      queryKey: [...payoutDisbursementKeys.payoutConfigs.byGrant(grantUID), "public"] as const,
      queryFn: () => payoutService.getPayoutConfigByGrantPublic(grantUID),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const dataKey = useMemo(() => queries.map((q) => q.dataUpdatedAt).join(","), [queries]);

  const allocationMap = useMemo(() => {
    return buildMilestoneAllocationMap(
      queries.map((q) => q.data),
      currencyByGrant
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, currencyByGrant]);

  return { allocationMap, isLoading };
}
