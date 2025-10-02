import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useTokenBalances, useMultiChainTokenBalances } from "@/hooks/useTokenBalances";
import type { SupportedToken } from "@/constants/supportedTokens";
import toast from "react-hot-toast";

interface TokenBalance {
  token: SupportedToken;
  formattedBalance: string;
}

interface BalanceError {
  message: string;
  chainIds: number[];
  canRetry: boolean;
}

const FETCH_TIMEOUT_MS = 10_000; // 10 seconds
const SLOW_FETCH_THRESHOLD_MS = 5_000; // 5 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000]; // Exponential backoff: 1s, 2s, 4s

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
        next[`${token.symbol}-${token.chainId}`] = formattedBalance;
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
            next[`${token.symbol}-${token.chainId}`] = formattedBalance;
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

    const delay = RETRY_DELAYS_MS[retryAttempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

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
