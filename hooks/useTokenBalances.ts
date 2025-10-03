"use client";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { useCallback, useMemo } from "react";
import { formatUnits } from "viem";
import { 
  SUPPORTED_TOKENS, 
  getTokensByChain, 
  SupportedToken 
} from "@/constants/supportedTokens";

interface TokenBalance {
  token: SupportedToken;
  balance: string;
  formattedBalance: string;
  hasBalance: boolean;
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

export function useTokenBalances(chainId?: number) {
  const { address, isConnected } = useAccount();

  // Get tokens for the current chain
  const tokensForChain = useMemo(() => {
    if (!chainId) return [];
    return getTokensByChain(chainId);
  }, [chainId]);

  // Get native token balance
  const { data: nativeBalance } = useBalance({
    address,
    chainId,
    query: {
      enabled: !!address && !!chainId && isConnected,
    },
  });

  // Get ERC20 token balances
  const erc20Tokens = useMemo(() => 
    tokensForChain.filter(token => !token.isNative),
    [tokensForChain]
  );

  const { data: erc20Balances } = useReadContracts({
    contracts: erc20Tokens.map(token => ({
      address: token.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
      chainId,
    })),
    query: {
      enabled: !!address && !!chainId && isConnected && erc20Tokens.length > 0,
    },
  });

  // Combine and format all balances
  const tokenBalances = useMemo((): TokenBalance[] => {
    if (!address || !chainId || !isConnected) return [];

    const results: TokenBalance[] = [];

    // Add native token balances
    const nativeTokens = tokensForChain.filter(token => token.isNative);
    nativeTokens.forEach(token => {
      const balance = nativeBalance?.value?.toString() || "0";
      const formattedBalance = formatUnits(BigInt(balance), token.decimals);
      
      results.push({
        token,
        balance,
        formattedBalance,
        hasBalance: BigInt(balance) > 0n,
      });
    });

    // Add ERC20 token balances
    erc20Tokens.forEach((token, index) => {
      const balanceResult = erc20Balances?.[index];
      const balance = balanceResult?.status === "success" 
        ? balanceResult.result?.toString() || "0"
        : "0";
      const formattedBalance = formatUnits(BigInt(balance), token.decimals);

      results.push({
        token,
        balance,
        formattedBalance,
        hasBalance: BigInt(balance) > 0n,
      });
    });

    return results;
  }, [
    address,
    chainId,
    isConnected,
    tokensForChain,
    nativeBalance,
    erc20Balances,
    erc20Tokens,
  ]);

  // Get tokens with balance
  const tokensWithBalance = useMemo(() => 
    tokenBalances.filter(item => item.hasBalance),
    [tokenBalances]
  );

  // Get balance for specific token
  const getTokenBalance = useCallback((tokenSymbol: string): TokenBalance | undefined => {
    return tokenBalances.find(item => item.token.symbol === tokenSymbol);
  }, [tokenBalances]);

  // Check if user has any supported tokens
  const hasAnyTokens = useMemo(() => 
    tokensWithBalance.length > 0,
    [tokensWithBalance]
  );

  return {
    tokenBalances,
    tokensWithBalance,
    hasAnyTokens,
    getTokenBalance,
    isLoading: !address || !chainId,
  };
}

// Hook for getting balances across multiple chains
export function useMultiChainTokenBalances(chainIds: number[] = []) {
  const { address, isConnected } = useAccount();

  const getAllTokensAcrossChains = useCallback(async (): Promise<TokenBalance[]> => {
    if (!address || !isConnected || chainIds.length === 0) return [];

    try {
      const { getRPCClient } = await import("@/utilities/rpcClient");
      const { formatUnits } = await import("viem");

      const allBalances: TokenBalance[] = [];

      // Fetch balances for each chain
      for (const chainId of chainIds) {
        try {
          const publicClient = await getRPCClient(chainId);
          if (!publicClient) continue;

          const tokensForChain = getTokensByChain(chainId);

          // Get native token balance
          const nativeTokens = tokensForChain.filter(token => token.isNative);
          for (const token of nativeTokens) {
            try {
              const balance = await publicClient.getBalance({ address: address as `0x${string}` });
              const formattedBalance = formatUnits(balance, token.decimals);

              allBalances.push({
                token,
                balance: balance.toString(),
                formattedBalance,
                hasBalance: balance > 0n,
              });
            } catch (error) {
              console.warn(`Failed to fetch native balance for ${token.symbol} on chain ${chainId}:`, error);
            }
          }

          // Get ERC20 token balances
          const erc20Tokens = tokensForChain.filter(token => !token.isNative);
          for (const token of erc20Tokens) {
            try {
              const balance = await publicClient.readContract({
                address: token.address as `0x${string}`,
                abi: [{
                  name: "balanceOf",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ name: "account", type: "address" }],
                  outputs: [{ name: "", type: "uint256" }],
                }],
                functionName: "balanceOf",
                args: [address as `0x${string}`],
              }) as bigint;

              const formattedBalance = formatUnits(balance, token.decimals);

              allBalances.push({
                token,
                balance: balance.toString(),
                formattedBalance,
                hasBalance: balance > 0n,
              });
            } catch (error) {
              console.warn(`Failed to fetch ERC20 balance for ${token.symbol} on chain ${chainId}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch balances for chain ${chainId}:`, error);
        }
      }

      return allBalances;
    } catch (error) {
      console.error("Failed to fetch multi-chain balances:", error);
      return [];
    }
  }, [address, isConnected, chainIds]);

  return {
    getAllTokensAcrossChains,
  };
}