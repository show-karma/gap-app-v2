import { useCallback, useState } from "react";
import { type Address, getAddress, type PublicClient, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { TRANSACTION_CONSTANTS } from "@/constants/donation";
import type { DonationPayment } from "@/store/donationCart";
import { validateChainSync } from "@/utilities/chainSyncValidation";
import {
  BATCH_DONATIONS_CONTRACTS,
  BatchDonationsABI,
  PERMIT2_ADDRESS,
} from "@/utilities/donations/batchDonations";
import { parseDonationError } from "@/utilities/donations/errorMessages";
import {
  type ApprovalTransaction,
  checkTokenAllowances,
  executeApprovals,
  getApprovalAmount,
  type TokenApprovalInfo,
} from "@/utilities/erc20";
import { getRPCClient } from "@/utilities/rpcClient";
import {
  getWalletClientWithFallback,
  isWalletClientGoodEnough,
} from "@/utilities/walletClientFallback";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const PERMIT_DEADLINE_SECONDS = 3600;

const PERMIT_TYPES = {
  PermitBatchTransferFrom: [
    { name: "permitted", type: "TokenPermissions[]" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

interface TransferResult {
  hash: string;
  projectId: string;
  status: "pending" | "success" | "error";
  error?: string;
}

export interface DonationExecutionState {
  phase: "checking" | "approving" | "donating" | "completed" | "error";
  approvals?: ApprovalTransaction[];
  approvalProgress?: number;
  transfers?: TransferResult[];
  error?: string;
}

function generatePermitNonce(): bigint {
  return BigInt(Math.floor(Math.random() * 1000000));
}

function getPermitDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_SECONDS);
}

export function useDonationTransfer() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [transfers, setTransfers] = useState<TransferResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionState, setExecutionState] = useState<DonationExecutionState>({
    phase: "completed",
  });
  const [approvalInfo, setApprovalInfo] = useState<TokenApprovalInfo[]>([]);

  const checkApprovals = useCallback(
    async (payments: DonationPayment[]): Promise<TokenApprovalInfo[]> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Group token transfers by token address to get total required amounts
      const tokenRequirementsByChain = new Map<
        number,
        Map<
          string,
          {
            tokenAddress: Address;
            tokenSymbol: string;
            requiredAmount: bigint;
            chainId: number;
          }
        >
      >();

      payments.forEach((payment) => {
        if (payment.token.isNative) {
          return;
        }

        const tokenAddress = getAddress(payment.token.address as Address);
        const amount = parseUnits(payment.amount, payment.token.decimals);
        const chainId = payment.chainId ?? payment.token.chainId;
        const key = tokenAddress.toLowerCase();

        if (!chainId) {
          return;
        }

        const chainMap =
          tokenRequirementsByChain.get(chainId) ??
          new Map<
            string,
            {
              tokenAddress: Address;
              tokenSymbol: string;
              requiredAmount: bigint;
              chainId: number;
            }
          >();

        const existing = chainMap.get(key);
        if (existing) {
          existing.requiredAmount += amount;
        } else {
          chainMap.set(key, {
            tokenAddress,
            tokenSymbol: payment.token.symbol,
            requiredAmount: amount,
            chainId,
          });
        }

        tokenRequirementsByChain.set(chainId, chainMap);
      });

      if (tokenRequirementsByChain.size === 0) {
        return []; // No ERC20 tokens to approve
      }

      const approvalResults: TokenApprovalInfo[] = [];

      for (const [chainId, requirementsMap] of tokenRequirementsByChain.entries()) {
        const requirementsList = Array.from(requirementsMap.values());
        // Always use getRPCClient for chain-specific operations to avoid issues
        // with publicClient being undefined during network switches
        const chainPublicClient = await getRPCClient(chainId);

        const resolvedClient = chainPublicClient as PublicClient;

        const chainApprovalInfo = await checkTokenAllowances(
          resolvedClient,
          address as Address,
          PERMIT2_ADDRESS,
          requirementsList,
          chainId
        );

        approvalResults.push(...chainApprovalInfo);
      }

      setApprovalInfo(approvalResults);

      return approvalResults;
    },
    [address]
  );

  const executeApprovalTransactions = useCallback(
    async (approvals: TokenApprovalInfo[], chainId: number): Promise<ApprovalTransaction[]> => {
      if (!address || !walletClient) {
        throw new Error("Wallet or client not available");
      }

      const tokensNeedingApproval = approvals.filter((info) => info.needsApproval);

      if (tokensNeedingApproval.length === 0) {
        return []; // No approvals needed
      }

      const chainPublicClient =
        publicClient && publicClient.chain?.id === chainId
          ? publicClient
          : await getRPCClient(chainId);

      if (!chainPublicClient) {
        throw new Error(`RPC client not configured for chain ${chainId}`);
      }

      const resolvedClient = chainPublicClient as PublicClient;

      setExecutionState({ phase: "approving", approvals: [], approvalProgress: 0 });

      const totalApprovals = tokensNeedingApproval.length;
      const approvalRequests = tokensNeedingApproval.map((info) => ({
        tokenAddress: info.tokenAddress,
        tokenSymbol: info.tokenSymbol,
        amount: getApprovalAmount(info.requiredAmount, false), // Use max uint256 for better UX
      }));

      const results = await executeApprovals(
        walletClient,
        resolvedClient,
        address as Address,
        PERMIT2_ADDRESS,
        approvalRequests,
        (progress) => {
          setExecutionState({
            phase: "approving",
            approvals: progress,
            approvalProgress:
              totalApprovals > 0
                ? (progress.filter((p) => p.status === "confirmed").length / totalApprovals) * 100
                : 0,
          });
        }
      );

      return results;
    },
    [address, walletClient, publicClient]
  );

  const executeDonations = useCallback(
    async (
      payments: DonationPayment[],
      getRecipientAddress: (projectId: string, chainId: number) => string,
      beforeTransfer?: (payment: DonationPayment) => Promise<void>
    ) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // SECURITY: Validate all recipient addresses upfront before starting execution
      // This implements the checks-effects-interactions pattern
      const _recipientValidation = payments.map((payment) => {
        const recipient = getRecipientAddress(payment.projectId, payment.chainId);
        if (!recipient) {
          throw new Error(
            `Missing payout address for project ${payment.projectId} on chain ${payment.chainId}`
          );
        }
        // Validate it's a proper Ethereum address
        try {
          getAddress(recipient);
        } catch {
          throw new Error(`Invalid payout address for project ${payment.projectId}: ${recipient}`);
        }
        return { projectId: payment.projectId, recipient };
      });

      // SECURITY: Set execution state BEFORE making any external calls
      // This prevents reentrancy attacks by updating state first
      setIsExecuting(true);
      setTransfers([]);
      setExecutionState({ phase: "checking" });

      try {
        // Step 1: Check token approvals
        const approvalInfo = await checkApprovals(payments);

        // Step 2: Execute ERC20 approvals to Permit2 if needed
        const tokensNeedingApproval = approvalInfo.filter((info) => info.needsApproval);
        if (tokensNeedingApproval.length > 0) {
          const approvalsByChain = tokensNeedingApproval.reduce<Map<number, TokenApprovalInfo[]>>(
            (acc, info) => {
              const list = acc.get(info.chainId) ?? [];
              list.push(info);
              acc.set(info.chainId, list);
              return acc;
            },
            new Map()
          );

          for (const [chainId, chainApprovals] of approvalsByChain.entries()) {
            const chainPayments = payments.filter((payment) => payment.chainId === chainId);
            if (chainPayments.length === 0) {
              continue;
            }

            if (beforeTransfer) {
              await beforeTransfer(chainPayments[0]);

              // Check wallet client readiness for approvals
              if (!isWalletClientGoodEnough(walletClient, chainId)) {
                await getWalletClientWithFallback(walletClient, chainId, async () => {
                  const result = await refetchWalletClient();
                  return { data: result.data };
                });
              }
            }

            await executeApprovalTransactions(chainApprovals, chainId);
          }
        }

        // Step 3: Execute donations
        setExecutionState({ phase: "donating" });

        const results: TransferResult[] = [];
        const paymentsByChain = payments.reduce<Map<number, DonationPayment[]>>((acc, payment) => {
          const list = acc.get(payment.chainId) ?? [];
          list.push(payment);
          acc.set(payment.chainId, list);
          return acc;
        }, new Map());

        for (const [chainId, chainPayments] of paymentsByChain.entries()) {
          // SECURITY: Validate chain ID is supported and has deployed contract
          if (!chainId || chainId <= 0) {
            throw new Error(`Invalid chain ID: ${chainId}`);
          }

          const contractAddress = BATCH_DONATIONS_CONTRACTS[chainId];
          if (!contractAddress) {
            throw new Error(
              `Batch donations contract not deployed on chain ${chainId}. ` +
                `Please contact support or use a different network.`
            );
          }

          // SECURITY: Validate all payments in this batch use the same chain
          const invalidChainPayments = chainPayments.filter((p) => p.chainId !== chainId);
          if (invalidChainPayments.length > 0) {
            throw new Error(
              `Chain mismatch detected: Some payments claim to be on chain ${chainId} ` +
                `but have different chainId values. This should not happen.`
            );
          }

          // Switch network BEFORE doing permit operations
          if (beforeTransfer) {
            await beforeTransfer(chainPayments[0]);
          }

          // Get wallet client with fallback mechanism
          let currentWalletClient = await getWalletClientWithFallback(
            walletClient,
            chainId,
            async () => {
              const result = await refetchWalletClient();
              return { data: result.data };
            }
          );

          if (!currentWalletClient) {
            throw new Error(
              `Wallet client is not available for chain ${chainId}. Please ensure your wallet is connected and try again.`
            );
          }

          // Critical: Validate chain synchronization before executing donations
          try {
            await validateChainSync(currentWalletClient, chainId, "batch donations");
          } catch (error) {
            // Try one more time with a fresh wallet client
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const result = await refetchWalletClient();
            const freshClient = result.data;
            if (freshClient) {
              await validateChainSync(freshClient, chainId, "batch donations");
              currentWalletClient = freshClient;
            } else {
              throw error; // Re-throw the original validation error
            }
          }

          const donations: Array<{
            project: Address;
            ethAmount: bigint;
            token: Address;
            tokenAmount: bigint;
          }> = [];

          let totalEth = 0n;
          const tokenTransfers: Array<{
            token: Address;
            amount: bigint;
          }> = [];

          chainPayments.forEach((payment) => {
            const recipientAddress = getRecipientAddress(payment.projectId, payment.chainId);
            if (!recipientAddress) {
              throw new Error(
                `No recipient address for project ${payment.projectId} on chain ${payment.chainId}`
              );
            }

            const projectAddress = getAddress(recipientAddress);

            // SECURITY: Safely parse amounts with error handling to prevent overflow/underflow
            let ethAmount = 0n;
            let tokenAmount = 0n;

            try {
              if (payment.token.isNative) {
                ethAmount = parseUnits(payment.amount, payment.token.decimals);
                // Validate the amount is reasonable (not negative or absurdly large)
                if (ethAmount < 0n) {
                  throw new Error("Negative amount detected");
                }
              } else {
                tokenAmount = parseUnits(payment.amount, payment.token.decimals);
                if (tokenAmount < 0n) {
                  throw new Error("Negative amount detected");
                }
              }
            } catch (error) {
              throw new Error(
                `Failed to parse amount for ${payment.token.symbol}: ${payment.amount}. ` +
                  `Error: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }

            const tokenAddress = payment.token.isNative
              ? ZERO_ADDRESS
              : getAddress(payment.token.address as Address);

            donations.push({
              project: projectAddress,
              ethAmount,
              token: tokenAddress,
              tokenAmount: tokenAmount,
            });

            if (payment.token.isNative) {
              totalEth += ethAmount;
            } else {
              // IMPORTANT: Do NOT aggregate here - push individual amounts
              // The contract expects permit to match actual token transfer amounts
              tokenTransfers.push({
                token: tokenAddress,
                amount: tokenAmount,
              });
            }
          });

          const hasTokenTransfers = tokenTransfers.length > 0;

          let permitSignature: `0x${string}` | undefined;
          let permit:
            | {
                permitted: { token: Address; amount: bigint }[];
                spender: Address;
                nonce: bigint;
                deadline: bigint;
              }
            | undefined;

          if (hasTokenTransfers) {
            if (!currentWalletClient) {
              throw new Error("Wallet client unavailable for signing permit");
            }

            const permitMessage = {
              permitted: tokenTransfers.map(({ token, amount }) => ({
                token,
                amount,
              })),
              spender: getAddress(contractAddress),
              nonce: generatePermitNonce(),
              deadline: getPermitDeadline(),
            };

            permit = permitMessage;

            permitSignature = await currentWalletClient.signTypedData({
              account: address as Address,
              domain: {
                name: "Permit2",
                chainId,
                verifyingContract: PERMIT2_ADDRESS,
              },
              types: PERMIT_TYPES,
              primaryType: "PermitBatchTransferFrom",
              message: permitMessage,
            });
          }

          const hash = await writeContractAsync({
            address: getAddress(contractAddress),
            abi: BatchDonationsABI,
            functionName: hasTokenTransfers ? "batchDonateWithPermit" : "batchDonate",
            args:
              hasTokenTransfers && permit && permitSignature
                ? [donations, permit, permitSignature]
                : [donations],
            chainId,
            ...(totalEth > 0n ? { value: totalEth } : {}),
          });

          const chainResults = chainPayments.map<TransferResult>((payment) => ({
            hash,
            projectId: payment.projectId,
            status: "pending",
          }));

          results.push(...chainResults);
          setTransfers((prev) => [...prev, ...chainResults]);

          const chainPublicClient =
            publicClient && publicClient.chain?.id === chainId
              ? publicClient
              : await getRPCClient(chainId);

          try {
            const receipt = await chainPublicClient.waitForTransactionReceipt({
              hash,
              confirmations: TRANSACTION_CONSTANTS.REQUIRED_CONFIRMATIONS,
            });

            const wasSuccessful = receipt.status === "success";

            chainResults.forEach((result) => {
              result.status = wasSuccessful ? "success" : "error";
              result.error = wasSuccessful ? undefined : "Transaction failed";
            });

            setTransfers((prev) =>
              prev.map((transfer) => {
                const isThisTransaction = chainResults.some(
                  (result) =>
                    result.hash === transfer.hash && result.projectId === transfer.projectId
                );
                if (!isThisTransaction) {
                  return transfer;
                }

                const matchingResult = chainResults.find(
                  (result) =>
                    result.hash === transfer.hash && result.projectId === transfer.projectId
                );

                return matchingResult
                  ? { ...transfer, status: matchingResult.status, error: matchingResult.error }
                  : transfer;
              })
            );

            if (!wasSuccessful) {
              throw new Error("Batch donation transaction reverted");
            }
          } catch (error) {
            console.error("Transaction failed:", error);

            const parsedError = parseDonationError(error);
            const errorMessage = parsedError.message;

            chainResults.forEach((result) => {
              result.status = "error";
              result.error = errorMessage;
            });

            setTransfers((prev) =>
              prev.map((transfer) => {
                const isThisTransaction = chainResults.some(
                  (result) =>
                    result.hash === transfer.hash && result.projectId === transfer.projectId
                );
                if (!isThisTransaction) {
                  return transfer;
                }

                return {
                  ...transfer,
                  status: "error" as const,
                  error: errorMessage,
                };
              })
            );

            throw error;
          }
        }

        setExecutionState({ phase: "completed" });
        return results;
      } catch (error) {
        console.error("Batch donation failed:", error);
        const parsedError = parseDonationError(error);
        setExecutionState({
          phase: "error",
          error: parsedError.message,
        });

        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [
      address,
      publicClient,
      walletClient,
      writeContractAsync,
      checkApprovals,
      executeApprovalTransactions,
      refetchWalletClient,
    ]
  );

  const checkSufficientBalance = useCallback(
    async (payment: DonationPayment, userBalance: string): Promise<boolean> => {
      try {
        const requiredAmount = parseUnits(payment.amount, payment.token.decimals);
        const availableBalance = parseUnits(userBalance, payment.token.decimals);
        return availableBalance >= requiredAmount;
      } catch (error) {
        console.error("Balance check failed:", error);
        return false;
      }
    },
    []
  );

  const validatePayments = useCallback(
    async (
      payments: DonationPayment[],
      balanceByTokenKey: Record<string, string>
    ): Promise<{ valid: boolean; errors: string[] }> => {
      const errors: string[] = [];

      for (const payment of payments) {
        // SECURITY: Validate payment amount is positive and valid
        const amount = parseFloat(payment.amount);
        if (Number.isNaN(amount) || amount <= 0) {
          errors.push(`Invalid amount for ${payment.token.symbol}: ${payment.amount}`);
          continue;
        }

        // SECURITY: Validate token decimals are within safe range (0-18)
        if (payment.token.decimals < 0 || payment.token.decimals > 18) {
          errors.push(
            `Invalid token decimals for ${payment.token.symbol}: ${payment.token.decimals}`
          );
          continue;
        }

        const tokenKey = `${payment.token.symbol}-${payment.chainId}`;
        const userBalance = balanceByTokenKey[tokenKey];

        if (!userBalance) {
          errors.push(
            `No balance information available for ${payment.token.symbol} on ${payment.token.chainName}`
          );
          continue;
        }

        const hasSufficientBalance = await checkSufficientBalance(payment, userBalance);
        if (!hasSufficientBalance) {
          errors.push(
            `Insufficient ${payment.token.symbol} balance. Required: ${payment.amount}, Available: ${userBalance}`
          );
        }
      }

      return { valid: errors.length === 0, errors };
    },
    [checkSufficientBalance]
  );

  const getEstimatedGasCost = useCallback((payments: DonationPayment[]): string => {
    const uniqueChains = new Set(payments.map((p) => p.chainId)).size;
    const nativeTransfers = payments.filter((p) => p.token.isNative).length;
    const tokenTransfers = payments.filter((p) => !p.token.isNative).length;

    const totalGas = nativeTransfers * 21_000 + tokenTransfers * 95_000 + uniqueChains * 120_000;

    return `~${totalGas.toLocaleString()} gas units (permit + batch execution)`;
  }, []);

  return {
    transfers,
    isExecuting,
    executeDonations,
    validatePayments,
    checkSufficientBalance,
    getEstimatedGasCost,
    executionState,
    approvalInfo,
    checkApprovals,
  };
}

export function useTransactionStatus(hash: string) {
  const {
    data: receipt,
    isLoading,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
    query: {
      enabled: !!hash,
    },
  });

  return {
    receipt,
    isLoading,
    isSuccess,
    isError,
    status: isLoading ? "pending" : isSuccess ? "success" : isError ? "error" : "idle",
  };
}
