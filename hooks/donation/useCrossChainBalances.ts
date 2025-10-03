import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useTokenBalances, useMultiChainTokenBalances } from "@/hooks/useTokenBalances";
import type { SupportedToken } from "@/constants/supportedTokens";
import toast from "react-hot-toast";
import {
  BALANCE_CONSTANTS,
  NETWORK_CONSTANTS,
  isCacheValid,
  getRetryDelay,
} from "@/constants/donation";
import { getTokenBalanceKey } from "@/utilities/donations/helpers";

interface TokenBalance {
  token: SupportedToken;
  formattedBalance: string;
}

interface BalanceError {
  message: string;
  chainIds: number[];
  canRetry: boolean;
}

interface CachedBalance {
  balance: string;
  timestamp: number;
}

// In-memory global cache for balance data (5 minute TTL)
// Shared across all hook instances for better performance
const globalBalanceCache = new Map<string, CachedBalance>();

const FETCH_TIMEOUT_MS = BALANCE_CONSTANTS.FETCH_TIMEOUT_MS;
const SLOW_FETCH_THRESHOLD_MS = BALANCE_CONSTANTS.SLOW_FETCH_WARNING_THRESHOLD_MS;
const MAX_RETRY_ATTEMPTS = NETWORK_CONSTANTS.SWITCH_MAX_RETRIES;
const RETRY_DELAYS_MS = NETWORK_CONSTANTS.RETRY_DELAYS_MS;

export function useCrossChainBalances(
  currentChainId: number | null,
  cartChainIds: number[]
) {
  const { address, isConnected } = useAccount();
  const { tokenBalances } = useTokenBalances(currentChainId ?? undefined);
  const { getAllTokensAcrossChains } = useMultiChainTokenBalances(cartChainIds);

  const [balanceCache, setBalanceCache] = useState<Record<string, string>>({});
  const [isFetchingCrossChainBalances, setIsFetchingCrossChainBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<BalanceError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isSlowFetch, setIsSlowFetch] = useState(false);
  const [successfulChains, setSuccessfulChains] = useState<number[]>([]);
  const [failedChains, setFailedChains] = useState<number[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const slowFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update balance cache with current network balances
  useEffect(() => {
    if (!tokenBalances.length) return;
    setBalanceCache((prev) => {
      const next = { ...prev };
      tokenBalances.forEach(({ token, formattedBalance }) => {
        const key = getTokenBalanceKey(token);
        next[key] = formattedBalance;

        // Also update the in-memory global cache
        globalBalanceCache.set(key, {
          balance: formattedBalance,
          timestamp: Date.now(),
        });
      });
      return next;
    });
  }, [tokenBalances]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (slowFetchTimeoutRef.current) {
        clearTimeout(slowFetchTimeoutRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchCrossChainBalances = useCallback(
    async (isRetry: boolean = false) => {
      if (!address || !isConnected || cartChainIds.length === 0) return;

      // Clear previous error state when starting new fetch
      if (!isRetry) {
        setBalanceError(null);
        setRetryAttempt(0);
        setFailedChains([]);
      }

      // Check cache first - load cached balances progressively
      const cachedBalances: Record<string, string> = {};
      let hasCachedData = false;

      cartChainIds.forEach((chainId) => {
        // Check global cache for each chain's tokens
        const allKeys = Array.from(globalBalanceCache.keys());
        const chainTokenKeys = allKeys.filter((key) =>
          key.endsWith(`-${chainId}`)
        );

        chainTokenKeys.forEach((key) => {
          const cached = globalBalanceCache.get(key);
          if (cached && isCacheValid(cached.timestamp)) {
            cachedBalances[key] = cached.balance;
            hasCachedData = true;
          }
        });
      });

      // If we have cached data, show it immediately (progressive loading)
      if (hasCachedData) {
        setBalanceCache((prev) => ({ ...prev, ...cachedBalances }));
      }

      setIsFetchingCrossChainBalances(true);
      setIsSlowFetch(false);

      // Create new abort controller for this fetch
      abortControllerRef.current = new AbortController();

      // Set up slow fetch warning
      slowFetchTimeoutRef.current = setTimeout(() => {
        setIsSlowFetch(true);
      }, SLOW_FETCH_THRESHOLD_MS);

      // Set up timeout for fetch
      const timeoutPromise = new Promise<never>((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          abortControllerRef.current?.abort();
          reject(new Error("Balance fetch timed out after 10 seconds"));
        }, FETCH_TIMEOUT_MS);
      });

      try {
        const balancesPromise = getAllTokensAcrossChains();
        const crossChainBalances = await Promise.race([balancesPromise, timeoutPromise]);

        // Clear timeouts on success
        if (slowFetchTimeoutRef.current) {
          clearTimeout(slowFetchTimeoutRef.current);
        }
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        setBalanceCache((prev) => {
          const next = { ...prev };
          crossChainBalances.forEach(({ token, formattedBalance }) => {
            const key = getTokenBalanceKey(token);
            next[key] = formattedBalance;

            // Update in-memory global cache with fresh data
            globalBalanceCache.set(key, {
              balance: formattedBalance,
              timestamp: Date.now(),
            });
          });
          return next;
        });

        // Track successful chains
        const successChains = Array.from(
          new Set(crossChainBalances.map((b) => b.token.chainId))
        );
        setSuccessfulChains(successChains);
        setBalanceError(null);
        setRetryAttempt(0);
      } catch (error) {
        // Clear timeouts on error
        if (slowFetchTimeoutRef.current) {
          clearTimeout(slowFetchTimeoutRef.current);
        }
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        console.error("Failed to fetch cross-chain balances:", error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch balances from some networks";

        // Track failed chains (assume all requested chains failed if we don't have specific info)
        const failedChainIds = cartChainIds.filter(
          (chainId) => !successfulChains.includes(chainId)
        );
        setFailedChains(failedChainIds);

        setBalanceError({
          message: errorMessage,
          chainIds: failedChainIds,
          canRetry: retryAttempt < MAX_RETRY_ATTEMPTS - 1,
        });

        // Show error toast
        if (!isRetry) {
          toast.error(
            "Unable to load all balances. You can still proceed with the donation.",
            {
              duration: 5000,
            }
          );
        }
      } finally {
        setIsFetchingCrossChainBalances(false);
        setIsSlowFetch(false);
      }
    },
    [address, isConnected, cartChainIds, getAllTokensAcrossChains, retryAttempt, successfulChains]
  );

  const retryFetchBalances = useCallback(async () => {
    if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
      toast.error("Maximum retry attempts reached. You can still proceed with the donation.");
      return;
    }

    const delay = getRetryDelay(retryAttempt);

    toast.loading(`Retrying in ${delay / 1000} seconds...`, { duration: delay });

    await new Promise((resolve) => setTimeout(resolve, delay));

    setRetryAttempt((prev) => prev + 1);
    await fetchCrossChainBalances(true);
  }, [retryAttempt, fetchCrossChainBalances]);

  // Fetch cross-chain balances when cart tokens are from multiple chains
  useEffect(() => {
    fetchCrossChainBalances();
  }, [address, isConnected, cartChainIds, getAllTokensAcrossChains]);

  const balanceByTokenKey = useMemo(() => balanceCache, [balanceCache]);

  return {
    balanceByTokenKey,
    isFetchingCrossChainBalances,
    balanceError,
    retryFetchBalances,
    isSlowFetch,
    successfulChains,
    failedChains,
    canRetry: balanceError?.canRetry ?? false,
  };
}
