import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getNativeTokenSymbol, NATIVE_TOKEN_ADDRESS } from "@/config/tokens";
import { getTokenByAddressAndChain } from "@/constants/supportedTokens";
import { payoutDisbursementKeys } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import * as payoutService from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
// Keep per-grant public configs cached well beyond staleTime so navigating
// between project pages reuses them instead of re-fetching (and re-risking the
// rate limit) on every mount.
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Stable empty reference so downstream `useMemo`s don't re-run while the
// community query is still loading (undefined data).
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
   * When supplied, fetch every payout config for the community in a SINGLE
   * request (`getPayoutConfigsByCommunityPublic`) and filter client-side to the
   * requested grants — instead of one request per grant. This is what keeps
   * milestone-report pages (50–200+ grants) from bursting past the indexer's
   * 30 req/min/IP per-route rate limit. Must be the on-chain community UID, not
   * a slug (the indexer matches the column exactly). See GAP-FRONTEND-245.
   */
  communityUID?: string;
}

interface PayoutConfigsForGrantsResult {
  configs: (PayoutGrantConfig | null | undefined)[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Internal hook: resolves the public payout configs for a set of grant UIDs.
 *
 * Two fetch strategies, selected by whether a `communityUID` is available:
 * - **With `communityUID`** — one shared community-wide query, filtered by
 *   `select` to the requested grants (5-min staleTime). One network request
 *   regardless of grant count, and it shares the cache entry with
 *   `usePayoutConfigsByCommunityPublic` (PublicControlCenter).
 * - **Without** — per-grant `useQueries` on the public single-grant key, cached
 *   for 30 min so navigation reuses them. Used by project-scoped callers that
 *   only have a handful of grants and no community UID at hand.
 *
 * Both `useQuery` and `useQueries` are always called (stable hook order); the
 * inactive strategy is simply disabled / fed an empty list.
 */
function usePayoutConfigsForGrants(
  grantUIDs: string[],
  options?: PayoutConfigsForGrantsOptions
): PayoutConfigsForGrantsResult {
  const communityUID = options?.communityUID;

  const uniqueGrantUIDs = useMemo(() => Array.from(new Set(grantUIDs)), [grantUIDs]);
  const requestedSet = useMemo(() => new Set(uniqueGrantUIDs), [uniqueGrantUIDs]);

  const selectRequested = useCallback(
    (all: PayoutGrantConfig[]) => all.filter((config) => requestedSet.has(config.grantUID)),
    [requestedSet]
  );

  // Batched, community-wide strategy (single request). Disabled when no
  // communityUID or nothing to fetch.
  const communityQuery = useQuery({
    queryKey: payoutDisbursementKeys.payoutConfigs.byCommunityPublic(communityUID ?? ""),
    queryFn: () => payoutService.getPayoutConfigsByCommunityPublic(communityUID as string),
    enabled: !!communityUID && uniqueGrantUIDs.length > 0,
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    select: selectRequested,
  });

  // Per-grant strategy (one request per unique grant). Fed an empty list when
  // the community strategy is active so it fires zero requests.
  const perGrantQueries = useQueries({
    queries: (communityUID ? [] : uniqueGrantUIDs).map((grantUID) => ({
      queryKey: payoutDisbursementKeys.payoutConfigs.byGrantPublic(grantUID),
      queryFn: () => payoutService.getPayoutConfigByGrantPublic(grantUID),
      staleTime: FIVE_MINUTES_MS,
      gcTime: THIRTY_MINUTES_MS,
    })),
  });

  const perGrantKey = perGrantQueries.map((q) => q.dataUpdatedAt).join(",");

  const perGrantConfigs = useMemo(
    () => perGrantQueries.map((q) => q.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perGrantKey]
  );

  if (communityUID) {
    return {
      configs: communityQuery.data ?? EMPTY_CONFIGS,
      isLoading: communityQuery.isLoading,
      isError: communityQuery.isError,
      error: communityQuery.error ?? null,
    };
  }

  return {
    configs: perGrantConfigs,
    isLoading: perGrantQueries.some((q) => q.isLoading),
    isError: perGrantQueries.some((q) => q.isError),
    error: perGrantQueries.find((q) => q.error)?.error ?? null,
  };
}

/**
 * Generic hook: fetches payout configs for given grant UIDs
 * and returns both milestone-level and grant-level allocation maps.
 *
 * Pass `communityUID` to batch the fetch into one community-wide request
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
 *
 * The batched community-wide request is used automatically when every
 * milestone shares one `communityUID` (the milestone payload carries it), or
 * when an explicit `communityUID` override is passed. Falls back to per-grant
 * fetches otherwise.
 */
export function useCommunityMilestoneAllocations(
  milestones: CommunityMilestoneUpdate[],
  options?: PayoutConfigsForGrantsOptions
) {
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

  // Derive the community UID straight from the milestone payload so the batched
  // single-request path is used without every caller having to thread it. Only
  // batch when the whole list belongs to exactly one community.
  const derivedCommunityUID = useMemo(() => {
    const uids = new Set<string>();
    for (const m of milestones) {
      if (m.communityUID) uids.add(m.communityUID);
    }
    return uids.size === 1 ? [...uids][0] : undefined;
  }, [milestones]);

  const resolvedOptions = useMemo<PayoutConfigsForGrantsOptions>(
    () => ({ communityUID: options?.communityUID ?? derivedCommunityUID }),
    [options?.communityUID, derivedCommunityUID]
  );

  const { configs, isLoading, isError, error } = usePayoutConfigsForGrants(
    uniqueGrantUIDs,
    resolvedOptions
  );

  const allocationMap = useMemo(
    () => buildMilestoneAllocationMap(configs, currencyByGrant),
    [configs, currencyByGrant]
  );

  return { allocationMap, isLoading, isError, error };
}
