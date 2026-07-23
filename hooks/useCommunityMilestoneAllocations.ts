import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getNativeTokenSymbol, NATIVE_TOKEN_ADDRESS } from "@/config/tokens";
import { getTokenByAddressAndChain } from "@/constants/supportedTokens";
import { payoutDisbursementKeys } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import * as payoutService from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
// Keep public configs cached well past staleTime so navigating between pages
// reuses them instead of re-fetching and re-risking the rate limit.
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Stable empty reference so downstream `useMemo`s don't re-run while the
// community query is still loading.
const EMPTY_CONFIGS: (PayoutGrantConfig | null | undefined)[] = [];

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

  const normalizedAddress = tokenAddress.toLowerCase();

  // 2. Check if it's the native token sentinel address
  if (normalizedAddress === NATIVE_TOKEN_ADDRESS.toLowerCase()) {
    return getNativeTokenSymbol(chainID);
  }

  // 3. Fall back to the canonical supported-token registry (covers USDC and all other ERC-20s)
  const token = getTokenByAddressAndChain(normalizedAddress, chainID);
  if (token) {
    return token.symbol;
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

    // Group totals by resolved currency to handle mixed-currency allocations
    const totalsByCurrency = new Map<string, number>();
    const CURRENCY_KEY_NONE = "__none__";

    for (const allocation of config.milestoneAllocations ?? []) {
      if (allocation.amount) {
        const parts = allocation.amount.trim().split(/\s+/);
        const numericStr = parts[0].replace(/[$,]/g, "");
        const numericValue = Number(numericStr);
        if (!Number.isNaN(numericValue)) {
          // Resolve to final currency: embedded suffix > resolved token symbol > sentinel
          const embeddedToken = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
          const currencyKey = embeddedToken ?? tokenSymbol ?? CURRENCY_KEY_NONE;
          totalsByCurrency.set(
            currencyKey,
            (totalsByCurrency.get(currencyKey) || 0) + numericValue
          );
        }
      }
    }

    // Build the formatted total string
    if (totalsByCurrency.size === 0) continue;

    if (totalsByCurrency.size === 1) {
      const [currencyKey, total] = [...totalsByCurrency.entries()][0];
      if (total <= 0) continue;

      const currency = currencyKey !== CURRENCY_KEY_NONE ? currencyKey : undefined;
      const formatted = formatMilestoneAmount(String(total), currency);
      if (formatted) {
        map.set(config.grantUID, formatted);
      }
    } else {
      // Mixed currencies: format each currency's total and join them
      const formattedParts: string[] = [];
      for (const [currencyKey, total] of totalsByCurrency) {
        if (total <= 0) continue;
        const currency = currencyKey !== CURRENCY_KEY_NONE ? currencyKey : undefined;
        const formatted = formatMilestoneAmount(String(total), currency);
        if (formatted) {
          formattedParts.push(formatted);
        }
      }
      if (formattedParts.length > 0) {
        map.set(config.grantUID, formattedParts.join(" + "));
      }
    }
  }

  return map;
}

interface PayoutConfigsForGrantsOptions {
  /**
   * On-chain community UID (never a slug — the indexer matches the column
   * exactly). When supplied, every public payout config for the community is
   * fetched in ONE request and seeded into the per-grant cache entries below,
   * so the per-grant queries resolve from cache and issue zero requests. This
   * is what stops milestone pages that fan out 50–200+ grants from bursting
   * past the indexer's 30 req/min/IP per-route limit. See GAP-FRONTEND-245.
   */
  communityUID?: string;
}

/**
 * Internal: resolves the public payout configs for a set of grant UIDs,
 * optionally priming them from a single community-wide request.
 *
 * The batch only ever SEEDS the canonical per-grant cache keys — the per-grant
 * queries stay the single read path. That is deliberate: an earlier attempt
 * batched by pointing a `select`-filtered query at the shared community key,
 * which gave different pages different views of the same cache entry. Seeding
 * the canonical keys instead means every consumer (report page, project pages,
 * milestone lists) observes exactly the value it would have fetched on its own,
 * so batching cannot make one page disagree with another.
 */
function usePayoutConfigsForGrants(grantUIDs: string[], options?: PayoutConfigsForGrantsOptions) {
  const communityUID = options?.communityUID;
  const queryClient = useQueryClient();

  const uniqueGrantUIDs = useMemo(() => Array.from(new Set(grantUIDs)), [grantUIDs]);

  const communityQuery = useQuery({
    queryKey: payoutDisbursementKeys.payoutConfigs.byCommunityPublic(communityUID ?? ""),
    queryFn: () => payoutService.getPayoutConfigsByCommunityPublic(communityUID as string),
    enabled: !!communityUID && uniqueGrantUIDs.length > 0,
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
  });

  const communityConfigs = communityQuery.data;

  // Seed each requested grant's canonical cache entry from the batch. A grant
  // the community response doesn't mention has no config, so it is seeded
  // `null` rather than left empty — otherwise it would fall through to its own
  // request and rebuild the fan-out this batching exists to remove.
  useEffect(() => {
    if (!communityUID || !communityConfigs) return;
    const configByGrant = new Map(communityConfigs.map((config) => [config.grantUID, config]));
    for (const grantUID of uniqueGrantUIDs) {
      queryClient.setQueryData(
        payoutDisbursementKeys.payoutConfigs.byGrantPublic(grantUID),
        configByGrant.get(grantUID) ?? null
      );
    }
  }, [communityUID, communityConfigs, uniqueGrantUIDs, queryClient]);

  // When batching, the batch itself is the read path and NO per-grant observer
  // is created — feeding `useQueries` an empty list keeps the request count at
  // exactly one regardless of grant count, with no dependence on whether the
  // seeding effect above happens to run before React Query schedules a fetch.
  const queries = useQueries({
    queries: (communityUID ? [] : uniqueGrantUIDs).map((grantUID) => ({
      queryKey: payoutDisbursementKeys.payoutConfigs.byGrantPublic(grantUID),
      queryFn: () => payoutService.getPayoutConfigByGrantPublic(grantUID),
      staleTime: FIVE_MINUTES_MS,
      gcTime: THIRTY_MINUTES_MS,
    })),
  });

  const dataKey = queries.map((q) => q.dataUpdatedAt).join(",");

  const perGrantConfigs = useMemo(
    () => queries.map((q) => q.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataKey]
  );

  // Project the batch onto the requested grants in the same order/shape the
  // per-grant path yields, so both modes build byte-identical allocation maps.
  const batchedConfigs = useMemo(() => {
    if (!communityUID || !communityConfigs) return undefined;
    const configByGrant = new Map(communityConfigs.map((config) => [config.grantUID, config]));
    return uniqueGrantUIDs.map((grantUID) => configByGrant.get(grantUID) ?? null);
  }, [communityUID, communityConfigs, uniqueGrantUIDs]);

  if (communityUID) {
    return {
      configs: batchedConfigs ?? EMPTY_CONFIGS,
      isLoading: communityQuery.isLoading,
      isError: communityQuery.isError,
      error: communityQuery.error ?? null,
    };
  }

  return {
    configs: perGrantConfigs,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    error: queries.find((q) => q.error)?.error ?? null,
  };
}

/**
 * Generic hook: fetches payout configs for given grant UIDs
 * and returns both milestone-level and grant-level allocation maps.
 *
 * Pass `communityUID` to collapse the fetch into one community-wide request
 * (recommended for pages that fan out many grants).
 */
export function useMilestoneAllocationsByGrants(
  grantUIDs: string[],
  currencyByGrant?: Map<string, string>,
  options?: PayoutConfigsForGrantsOptions
) {
  const { configs, isLoading, isError, error } = usePayoutConfigsForGrants(grantUIDs, options);

  const allocationMap = useMemo(
    () => buildMilestoneAllocationMap(configs, currencyByGrant),
    [configs, currencyByGrant]
  );

  const grantTotalMap = useMemo(
    () => buildGrantAllocationTotalMap(configs, currencyByGrant),
    [configs, currencyByGrant]
  );

  return { allocationMap, grantTotalMap, isLoading, isError, error };
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

  // Only batch when every milestone belongs to the same community. A mixed
  // list would otherwise be seeded against one community's configs and the
  // other communities' grants would be wrongly recorded as having none.
  const communityUID = useMemo(() => {
    const uids = new Set<string>();
    for (const m of milestones) {
      if (m.communityUID) uids.add(m.communityUID);
    }
    return uids.size === 1 ? Array.from(uids)[0] : undefined;
  }, [milestones]);

  const { configs, isLoading, isError, error } = usePayoutConfigsForGrants(uniqueGrantUIDs, {
    communityUID,
  });

  const allocationMap = useMemo(
    () => buildMilestoneAllocationMap(configs, currencyByGrant),
    [configs, currencyByGrant]
  );

  return { allocationMap, isLoading, isError, error };
}
