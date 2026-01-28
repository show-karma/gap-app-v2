"use client";

import { useCallback, useState } from "react";
import { type Address, formatUnits, getAddress, type Hash, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { KARMA_SEEDS_CONFIG, type KarmaSeedsConfig } from "@/types/karmaSeeds";
import KarmaSeedFactoryABI from "@/utilities/abi/KarmaSeedFactoryV2.json";
import KarmaSeedABI from "@/utilities/abi/KarmaSeedV2.json";
import { getRPCClient } from "@/utilities/rpcClient";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface LaunchSeedsParams {
  projectName: string;
  tokenName: string;
  tokenSymbol: string;
  treasury: Address;
  maxSupply: string;
  factoryAddress: Address;
  chainId: number;
}

export interface LaunchSeedsResult {
  tokenAddress: Address;
  txHash: Hash;
}

export interface BuySeedsWithEthParams {
  ethAmount: string;
}

export interface BuySeedsWithTokenParams {
  tokenAddress: Address;
  amount: string;
  decimals: number;
}

export interface BuySeedsResult {
  txHash: Hash;
  tokensMinted: string;
}

export type TransactionPhase =
  | "idle"
  | "approving"
  | "pending"
  | "confirming"
  | "success"
  | "error";

export interface TransactionState {
  phase: TransactionPhase;
  txHash?: Hash;
  error?: string;
}

/**
 * Hook for launching Karma Seeds via factory contract
 * Factory address and chainId are now passed in LaunchSeedsParams (lazy loaded)
 */
export function useLaunchKarmaSeeds() {
  const { address, chainId: currentChainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<TransactionState>({ phase: "idle" });

  const launch = useCallback(
    async (params: LaunchSeedsParams): Promise<LaunchSeedsResult> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const { factoryAddress, chainId } = params;

      if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Factory contract not available for this network");
      }

      setState({ phase: "pending" });

      try {
        // Switch to target chain if not already on it
        if (currentChainId !== chainId) {
          await switchChainAsync({ chainId });
        }

        const maxSupplyWei = parseUnits(params.maxSupply, 18);

        const txHash = await writeContractAsync({
          address: factoryAddress,
          abi: KarmaSeedFactoryABI,
          functionName: "createKarmaSeed",
          args: [
            {
              projectName: params.projectName,
              tokenName: params.tokenName,
              tokenSymbol: params.tokenSymbol,
              treasury: params.treasury,
              maxSupply: maxSupplyWei,
            },
          ],
          chainId,
        });

        setState({ phase: "confirming", txHash });

        const chainClient =
          publicClient?.chain?.id === chainId ? publicClient : await getRPCClient(chainId);

        const receipt = await chainClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        const karmaSeedCreatedLog = receipt.logs.find((log) => {
          return (
            log.topics[0] === "0x15985ceb3e66d4b6ed07ac1156f138e903f8a114eedf4401e45cdbe2cb10f422"
          );
        });

        let tokenAddress: Address;
        if (karmaSeedCreatedLog && karmaSeedCreatedLog.topics[2]) {
          tokenAddress = getAddress(`0x${karmaSeedCreatedLog.topics[2].slice(26)}`) as Address;
        } else {
          const projectAddress = (await chainClient.readContract({
            address: factoryAddress,
            abi: KarmaSeedFactoryABI,
            functionName: "projects",
            args: [params.projectName],
          })) as Address;

          if (!projectAddress || projectAddress === "0x0000000000000000000000000000000000000000") {
            throw new Error("Failed to get deployed token address");
          }

          tokenAddress = projectAddress;
        }

        setState({ phase: "success", txHash });

        return {
          tokenAddress,
          txHash,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState({ phase: "error", error: errorMessage });
        throw error;
      }
    },
    [address, currentChainId, publicClient, writeContractAsync, switchChainAsync]
  );

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  return {
    launch,
    state,
    reset,
    isLoading: state.phase === "pending" || state.phase === "confirming",
    isSuccess: state.phase === "success",
    isError: state.phase === "error",
  };
}

/**
 * Hook for buying Karma Seeds tokens
 */
export function useBuyKarmaSeeds(
  contractAddress: Address | undefined,
  config: KarmaSeedsConfig = KARMA_SEEDS_CONFIG
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TransactionState>({ phase: "idle" });

  const buyWithEth = useCallback(
    async (params: BuySeedsWithEthParams): Promise<BuySeedsResult> => {
      if (!address || !contractAddress) {
        throw new Error("Wallet not connected or contract not set");
      }

      setState({ phase: "pending" });

      try {
        const ethAmountWei = parseUnits(params.ethAmount, 18);

        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: KarmaSeedABI,
          functionName: "buy",
          value: ethAmountWei,
          chainId: config.chainID,
        });

        setState({ phase: "confirming", txHash });

        const chainClient =
          publicClient?.chain?.id === config.chainID
            ? publicClient
            : await getRPCClient(config.chainID);

        const receipt = await chainClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        setState({ phase: "success", txHash });

        return {
          txHash,
          tokensMinted: "0",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState({ phase: "error", error: errorMessage });
        throw error;
      }
    },
    [address, contractAddress, publicClient, writeContractAsync, config]
  );

  const buyWithToken = useCallback(
    async (params: BuySeedsWithTokenParams): Promise<BuySeedsResult> => {
      if (!address || !contractAddress || !walletClient) {
        throw new Error("Wallet not connected or contract not set");
      }

      setState({ phase: "approving" });

      try {
        const amountWei = parseUnits(params.amount, params.decimals);
        const chainClient =
          publicClient?.chain?.id === config.chainID
            ? publicClient
            : await getRPCClient(config.chainID);

        const allowance = (await chainClient.readContract({
          address: params.tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, contractAddress],
        })) as bigint;

        if (allowance < amountWei) {
          const approveTxHash = await writeContractAsync({
            address: params.tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [contractAddress, amountWei],
            chainId: config.chainID,
          });

          await chainClient.waitForTransactionReceipt({
            hash: approveTxHash,
            confirmations: 1,
          });
        }

        setState({ phase: "pending" });

        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: KarmaSeedABI,
          functionName: "buyWithToken",
          args: [params.tokenAddress, amountWei],
          chainId: config.chainID,
        });

        setState({ phase: "confirming", txHash });

        const receipt = await chainClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        setState({ phase: "success", txHash });

        return {
          txHash,
          tokensMinted: "0",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState({ phase: "error", error: errorMessage });
        throw error;
      }
    },
    [address, contractAddress, publicClient, walletClient, writeContractAsync, config]
  );

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  return {
    buyWithEth,
    buyWithToken,
    state,
    reset,
    isLoading:
      state.phase === "approving" || state.phase === "pending" || state.phase === "confirming",
    isSuccess: state.phase === "success",
    isError: state.phase === "error",
  };
}

/**
 * Hook for reading Karma Seeds token data from the contract
 */
export function useKarmaSeedsTokenData(
  contractAddress: Address | undefined,
  config: KarmaSeedsConfig = KARMA_SEEDS_CONFIG
) {
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "totalSupply",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  const { data: maxSupply } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "maxSupply",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  const { data: remainingSupply } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "remainingSupply",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  const { data: ethPrice } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "getEthPrice",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  const { data: tokenName } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "name",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  const { data: tokenSymbol } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "symbol",
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress,
    },
  });

  return {
    totalSupply: totalSupply ? formatUnits(totalSupply as bigint, 18) : "0",
    totalSupplyRaw: totalSupply as bigint | undefined,
    maxSupply: maxSupply ? formatUnits(maxSupply as bigint, 18) : "0",
    maxSupplyRaw: maxSupply as bigint | undefined,
    remainingSupply: remainingSupply ? formatUnits(remainingSupply as bigint, 18) : "0",
    remainingSupplyRaw: remainingSupply as bigint | undefined,
    ethPrice: ethPrice ? formatUnits(ethPrice as bigint, 8) : "0",
    ethPriceRaw: ethPrice as bigint | undefined,
    tokenName: tokenName as string | undefined,
    tokenSymbol: tokenSymbol as string | undefined,
    refetchTotalSupply,
  };
}

/**
 * Hook for previewing token purchase amounts
 */
export function usePreviewBuySeeds(
  contractAddress: Address | undefined,
  config: KarmaSeedsConfig = KARMA_SEEDS_CONFIG
) {
  const publicClient = usePublicClient();

  const previewBuyWithEth = useCallback(
    async (ethAmount: string): Promise<string> => {
      if (!contractAddress) {
        throw new Error("Contract address not set");
      }

      const chainClient =
        publicClient?.chain?.id === config.chainID
          ? publicClient
          : await getRPCClient(config.chainID);

      const ethAmountWei = parseUnits(ethAmount, 18);

      const tokensAmount = (await chainClient.readContract({
        address: contractAddress,
        abi: KarmaSeedABI,
        functionName: "previewBuyWithETH",
        args: [ethAmountWei],
      })) as bigint;

      return formatUnits(tokensAmount, 18);
    },
    [contractAddress, publicClient, config]
  );

  const previewBuyWithToken = useCallback(
    async (tokenAddress: Address, amount: string, decimals: number): Promise<string> => {
      if (!contractAddress) {
        throw new Error("Contract address not set");
      }

      const chainClient =
        publicClient?.chain?.id === config.chainID
          ? publicClient
          : await getRPCClient(config.chainID);

      const amountWei = parseUnits(amount, decimals);

      const tokensAmount = (await chainClient.readContract({
        address: contractAddress,
        abi: KarmaSeedABI,
        functionName: "previewBuyWithToken",
        args: [tokenAddress, amountWei],
      })) as bigint;

      return formatUnits(tokensAmount, 18);
    },
    [contractAddress, publicClient, config]
  );

  return {
    previewBuyWithEth,
    previewBuyWithToken,
  };
}

/**
 * Hook for getting user's Karma Seeds token balance
 */
export function useKarmaSeedsBalance(
  contractAddress: Address | undefined,
  config: KarmaSeedsConfig = KARMA_SEEDS_CONFIG
) {
  const { address } = useAccount();

  const { data: balance, refetch } = useReadContract({
    address: contractAddress,
    abi: KarmaSeedABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: config.chainID,
    query: {
      enabled: !!contractAddress && !!address,
    },
  });

  return {
    balance: balance ? formatUnits(balance as bigint, 18) : "0",
    balanceRaw: balance as bigint | undefined,
    refetch,
  };
}
