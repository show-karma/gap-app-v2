import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import type { SupportedToken } from "@/constants/supportedTokens";
import { getTokensByChain } from "@/constants/supportedTokens";
import { getTokenBalanceKey } from "@/utilities/donations/helpers";
import { getRPCClient } from "@/utilities/rpcClient";

interface TokenBalance {
  token: SupportedToken;
  formattedBalance: string;
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Query keys for react-query
export const BALANCE_QUERY_KEYS = {
  all: ["token-balances"] as const,
  chain: (chainId: number, address: string) =>
    [...BALANCE_QUERY_KEYS.all, "chain", chainId, address] as const,
  allChains: (chainIds: number[], address: string) =>
    [...BALANCE_QUERY_KEYS.all, "multi-chain", chainIds.join("-"), address] as const,
};

/**
 * Fetches token balances for a single chain using batched multicall
 */
async function fetchChainBalances(chainId: number, address: string): Promise<TokenBalance[]> {
  const publicClient = await getRPCClient(chainId);
  const tokensForChain = getTokensByChain(chainId);
  const balances: TokenBalance[] = [];

  // Separate native and ERC20 tokens
  const nativeTokens = tokensForChain.filter((t) => t.isNative);
  const erc20Tokens = tokensForChain.filter((t) => !t.isNative);

  // Fetch native balance (if any)
  if (nativeTokens.length > 0) {
    try {
      const nativeBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      nativeTokens.forEach((token) => {
        balances.push({
          token,
          formattedBalance: formatUnits(nativeBalance, token.decimals),
        });
      });
    } catch (error) {
      console.warn(`Failed to fetch native balance on chain ${chainId}:`, error);
      // Add zero balance as fallback
      nativeTokens.forEach((token) => {
        balances.push({
          token,
          formattedBalance: "0",
        });
      });
    }
  }

  // Batch fetch all ERC20 balances using multicall
  if (erc20Tokens.length > 0) {
    try {
      const contracts = erc20Tokens.map((token) => ({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`],
      }));

      const results = await publicClient.multicall({
        contracts,
        allowFailure: true,
      });

      results.forEach((result, index) => {
        const token = erc20Tokens[index];
        if (result.status === "success" && result.result !== undefined) {
          balances.push({
            token,
            formattedBalance: formatUnits(result.result as bigint, token.decimals),
          });
        } else {
          console.warn(
            `Failed to fetch balance for ${token.symbol} on chain ${chainId}:`,
            result.status === "failure" ? result.error : "Unknown error"
          );
          // Add zero balance as fallback
          balances.push({
            token,
            formattedBalance: "0",
          });
        }
      });
    } catch (error) {
      console.warn(`Failed to fetch ERC20 balances on chain ${chainId}:`, error);
      // Add zero balances as fallback
      erc20Tokens.forEach((token) => {
        balances.push({
          token,
          formattedBalance: "0",
        });
      });
    }
  }

  return balances;
}

/**
 * Fetches balances across multiple chains in parallel
 */
async function fetchMultiChainBalances(
  chainIds: number[],
  address: string
): Promise<Record<string, string>> {
  // Fetch all chains in parallel
  const balancePromises = chainIds.map((chainId) =>
    fetchChainBalances(chainId, address).catch((error) => {
      console.error(`Failed to fetch balances for chain ${chainId}:`, error);
      return [] as TokenBalance[];
    })
  );

  const results = await Promise.all(balancePromises);

  // Flatten results and convert to key-value map
  const balanceMap: Record<string, string> = {};
  results.flat().forEach(({ token, formattedBalance }) => {
    const key = getTokenBalanceKey(token);
    balanceMap[key] = formattedBalance;
  });

  return balanceMap;
}

export function useCrossChainBalances(_currentChainId: number | null, chainIds: number[]) {
  const { address, isConnected } = useAccount();

  // Use react-query for caching, automatic refetching, and state management
  const {
    data: balanceByTokenKey = {},
    isLoading: isFetchingCrossChainBalances,
    error,
    refetch,
  } = useQuery({
    queryKey: BALANCE_QUERY_KEYS.allChains(chainIds, address || ""),
    queryFn: () => fetchMultiChainBalances(chainIds, address!),
    enabled: !!address && isConnected && chainIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - balances don't change that often
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for longer
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  const retryFetchBalances = () => {
    refetch();
  };

  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    balanceByTokenKey,
    isFetchingCrossChainBalances,
    balanceError: error ? { message: errorMessage, chainIds: [], canRetry: true } : null,
    retryFetchBalances,
    isSlowFetch: false, // react-query handles this internally
    successfulChains: chainIds, // If query succeeds, all chains are successful
    failedChains: error ? chainIds : [], // If query fails, assume all failed
    canRetry: !!error,
  };
}
