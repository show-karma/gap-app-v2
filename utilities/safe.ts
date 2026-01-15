import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import { encodeFunctionData, erc20Abi, formatUnits, parseUnits } from "viem";
import { NATIVE_TOKENS, NETWORKS, type SupportedChainId, TOKEN_ADDRESSES } from "../config/tokens";
import type { DisbursementRecipient } from "../types/disbursement";
import { getRPCClient } from "./rpcClient";

/**
 * Transaction status returned from Safe Transaction Service
 */
export interface SafeTransactionStatus {
  isExecuted: boolean;
  isSuccessful: boolean | null;
  transactionHash: string | null;
  executionDate: string | null;
  confirmationsRequired: number;
  confirmationsSubmitted: number;
}

// Safe Transaction Service network identifiers for the unified API
// These are used with api.safe.global/tx-service/{network}/v1/
const SAFE_NETWORK_IDS: Partial<Record<SupportedChainId, string>> = {
  // Mainnets
  1: "mainnet",
  10: "optimism",
  137: "polygon",
  8453: "base",
  42161: "arbitrum",
  42220: "celo",
  534352: "scroll",
  // Note: Sei and Lisk don't have official Safe Transaction Service yet
  // Testnets
  11155111: "sepolia",
  11155420: "optimism-sepolia",
  84532: "base-sepolia",
};

/**
 * Gets the Safe Transaction Service URL for a chain
 * Uses the format: https://safe-transaction-{network}.safe.global
 */
function getSafeServiceUrl(chainId: SupportedChainId): string | null {
  const networkId = SAFE_NETWORK_IDS[chainId];
  if (!networkId) return null;
  return `https://safe-transaction-${networkId}.safe.global`;
}

/**
 * Checks if a signer address is an owner of the specified Safe
 */
export async function isSafeOwner(
  safeAddress: string,
  signerAddress: string,
  chainId: SupportedChainId
): Promise<boolean> {
  try {
    const rpcUrl = NETWORKS[chainId].rpcUrl;

    // Initialize Safe SDK with RPC URL
    const safe = await Safe.init({
      provider: rpcUrl,
      safeAddress,
    });

    // Get Safe owners
    const owners = await safe.getOwners();

    // Check if signer is one of the owners
    return owners.some((owner) => owner.toLowerCase() === signerAddress.toLowerCase());
  } catch (error) {
    console.error("Error checking Safe ownership:", error);
    return false;
  }
}

/**
 * Checks if a signer address is a delegate (proposer) for the specified Safe
 */
export async function isSafeDelegate(
  safeAddress: string,
  signerAddress: string,
  chainId: SupportedChainId
): Promise<boolean> {
  const txServiceUrl = getSafeServiceUrl(chainId);
  if (!txServiceUrl) {
    return false;
  }

  try {
    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
      txServiceUrl,
    });

    // Get delegates for this Safe
    const delegates = await apiKit.getSafeDelegates({ safeAddress });

    // Check if signer is a delegate
    return delegates.results.some(
      (delegate) => delegate.delegate.toLowerCase() === signerAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Error checking Safe delegate status:", error);
    return false;
  }
}

/**
 * Checks if a signer address can propose transactions (is either owner or delegate)
 */
export async function canProposeToSafe(
  safeAddress: string,
  signerAddress: string,
  chainId: SupportedChainId
): Promise<{ canPropose: boolean; isOwner: boolean; isDelegate: boolean }> {
  const [isOwner, isDelegate] = await Promise.all([
    isSafeOwner(safeAddress, signerAddress, chainId),
    isSafeDelegate(safeAddress, signerAddress, chainId),
  ]);

  return {
    canPropose: isOwner || isDelegate,
    isOwner,
    isDelegate,
  };
}

/**
 * Checks if a Safe is indexed by Safe's Transaction Service
 * This is required before proposing transactions
 */
export async function isSafeIndexed(
  safeAddress: string,
  chainId: SupportedChainId
): Promise<boolean> {
  const txServiceUrl = getSafeServiceUrl(chainId);
  if (!txServiceUrl) {
    return false;
  }

  try {
    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
      txServiceUrl,
    });

    await apiKit.getSafeInfo(safeAddress);
    return true;
  } catch (error: any) {
    // 404 means not indexed
    if (
      error?.response?.status === 404 ||
      error?.message?.includes("404") ||
      error?.message?.includes("Not Found")
    ) {
      return false;
    }
    // Other errors - assume not indexed to be safe
    console.error("Error checking Safe indexing:", error);
    return false;
  }
}

/**
 * Fetches the token balance of the specified Safe
 * @param safeAddress - The Safe wallet address
 * @param tokenAddress - The ERC20 token contract address, or null for native token balance
 * @param chainId - The chain ID
 */
export async function getSafeTokenBalance(
  safeAddress: string,
  tokenAddress: string | null,
  chainId: SupportedChainId
): Promise<{
  balance: string;
  balanceFormatted: string;
  decimals: number;
}> {
  try {
    const publicClient = await getRPCClient(chainId);

    // If no token address, fetch native token balance
    if (!tokenAddress) {
      const nativeToken = NATIVE_TOKENS[chainId];
      const balance = await publicClient.getBalance({
        address: safeAddress as `0x${string}`,
      });

      const decimals = nativeToken?.decimals || 18;
      const balanceFormatted = formatUnits(balance, decimals);

      return {
        balance: balance.toString(),
        balanceFormatted,
        decimals,
      };
    }

    // Fetch ERC20 token balance
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [safeAddress as `0x${string}`],
    });

    // Get token decimals
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    });

    const balanceFormatted = formatUnits(balance, decimals);

    return {
      balance: balance.toString(),
      balanceFormatted,
      decimals,
    };
  } catch (error) {
    console.error("Error fetching Safe token balance:", error);
    throw new Error("Failed to fetch Safe balance");
  }
}

/**
 * Checks if a Safe is deployed on the specified network
 */
export async function isSafeDeployed(
  safeAddress: string,
  chainId: SupportedChainId
): Promise<boolean> {
  try {
    const publicClient = await getRPCClient(chainId);

    // Check if there's code at the Safe address
    const code = await publicClient.getBytecode({
      address: safeAddress as `0x${string}`,
    });

    // If there's no code, the Safe is not deployed
    return code !== undefined && code !== "0x";
  } catch (error) {
    console.error("Error checking Safe deployment:", error);
    return false;
  }
}

/**
 * Gets basic Safe information including threshold and owner count
 */
export async function getSafeInfo(
  safeAddress: string,
  chainId: SupportedChainId
): Promise<{
  owners: string[];
  threshold: number;
  nonce: number;
}> {
  try {
    const rpcUrl = NETWORKS[chainId].rpcUrl;

    const safe = await Safe.init({
      provider: rpcUrl,
      safeAddress,
    });

    const [owners, threshold, nonce] = await Promise.all([
      safe.getOwners(),
      safe.getThreshold(),
      safe.getNonce(),
    ]);

    return {
      owners,
      threshold,
      nonce,
    };
  } catch (error) {
    console.error("Error fetching Safe info:", error);
    throw new Error("Failed to fetch Safe information");
  }
}

/**
 * Prepares a batched transaction for token disbursement
 * @param safeAddress - The Safe wallet address
 * @param recipients - Array of recipients with addresses and amounts
 * @param tokenAddress - The ERC20 token contract address, or null for native token transfers
 * @param chainId - The chain ID
 * @param decimals - Token decimals (required for custom tokens or when token address is provided)
 */
export async function prepareDisbursementTransaction(
  safeAddress: string,
  recipients: DisbursementRecipient[],
  tokenAddress: string | null,
  chainId: SupportedChainId,
  decimals: number = 18
) {
  try {
    const rpcUrl = NETWORKS[chainId].rpcUrl;

    // Initialize Safe SDK
    const safe = await Safe.init({
      provider: rpcUrl,
      safeAddress,
    });

    // If we have a token address, fetch decimals from the contract
    let effectiveDecimals = decimals;
    if (tokenAddress) {
      const publicClient = await getRPCClient(chainId);
      try {
        effectiveDecimals = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "decimals",
        });
      } catch {
        // Use provided decimals if fetch fails
        console.warn("Failed to fetch token decimals, using provided value:", decimals);
      }
    }

    // Create individual transfer transactions
    const transactions = recipients
      .filter((recipient) => !recipient.error) // Only include valid recipients
      .map((recipient) => {
        // Convert amount to wei units based on token decimals
        const amount = parseUnits(recipient.amount, effectiveDecimals);

        // Native token transfer (no token address)
        if (!tokenAddress) {
          return {
            to: recipient.address,
            value: amount.toString(),
            data: "0x",
          };
        }

        // ERC20 token transfer
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient.address as `0x${string}`, amount],
        });

        return {
          to: tokenAddress,
          value: "0",
          data,
        };
      });

    // Create the batched transaction
    const safeTx = await safe.createTransaction({
      transactions,
    });

    return {
      safeTx,
      totalRecipients: transactions.length,
      totalAmount: recipients
        .filter((r) => !r.error)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0),
    };
  } catch (error) {
    console.error("Error preparing disbursement transaction:", error);
    throw new Error("Failed to prepare transaction");
  }
}

/**
 * Creates an Ethereum provider compatible with Safe SDK from wagmi wallet client
 */
function createEthereumProvider(walletClient: any, chainId: SupportedChainId) {
  const rpcUrl = NETWORKS[chainId].rpcUrl;

  // Create a provider object that Safe SDK can understand
  return {
    request: async (args: { method: string; params?: any }) => {
      const { method, params } = args;

      try {
        // Handle signing methods through wallet client
        if (method === "eth_sendTransaction") {
          return await walletClient.sendTransaction(params[0]);
        }

        if (method === "eth_signTransaction") {
          return await walletClient.signTransaction(params[0]);
        }

        if (method === "eth_signTypedData_v4" || method === "eth_signTypedData") {
          // params[0] is the address, params[1] is the typed data
          const [address, typedData] = params;

          // Parse the typed data if it's a string
          const parsedTypedData = typeof typedData === "string" ? JSON.parse(typedData) : typedData;

          // Verify the address matches the wallet client account
          if (address?.toLowerCase() !== walletClient.account?.address?.toLowerCase()) {
            throw new Error(`Address mismatch: ${address} vs ${walletClient.account?.address}`);
          }

          return await walletClient.signTypedData({
            domain: parsedTypedData.domain,
            types: parsedTypedData.types,
            primaryType: parsedTypedData.primaryType,
            message: parsedTypedData.message,
          });
        }

        if (method === "personal_sign") {
          // params[0] is the message, params[1] is the address
          const [message, address] = params;

          // Verify the address matches the wallet client account
          if (address?.toLowerCase() !== walletClient.account?.address?.toLowerCase()) {
            throw new Error(`Address mismatch: ${address} vs ${walletClient.account?.address}`);
          }

          return await walletClient.signMessage({
            message:
              typeof message === "string" && message.startsWith("0x") ? { raw: message } : message,
          });
        }

        // Handle account access
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          const accounts = [walletClient.account?.address].filter(Boolean);
          return accounts;
        }

        // Handle chain ID
        if (method === "eth_chainId") {
          const chainIdHex = `0x${chainId.toString(16)}`;
          return chainIdHex;
        }
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params: params || [],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.error) {
          console.error("RPC error:", result.error);
          throw new Error(result.error.message);
        }

        return result.result;
      } catch (error) {
        console.error(`Provider request failed for method ${method}:`, error);
        console.error("Error details:", {
          method,
          params,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
  };
}

/**
 * Signs and proposes a disbursement transaction to the Safe (never executes)
 * This function only proposes the transaction - actual signing/execution happens in Safe app
 *
 * @param safeAddress - The Safe wallet address
 * @param recipients - Array of recipients with addresses and amounts
 * @param tokenAddress - The ERC20 token contract address, or null for native token transfers
 * @param chainId - The chain ID
 * @param walletClient - The wallet client from wagmi
 * @param decimals - Token decimals (default: 18 for native tokens)
 */
export async function signAndProposeDisbursement(
  safeAddress: string,
  recipients: DisbursementRecipient[],
  tokenAddress: string | null,
  chainId: SupportedChainId,
  walletClient: any,
  decimals: number = 18
) {
  // Validate inputs
  if (!walletClient?.account?.address) {
    throw new Error("Wallet client is not properly connected");
  }

  if (!safeAddress || !recipients.length) {
    throw new Error("Missing required parameters");
  }

  // Validate Safe Transaction Service is available
  const txServiceUrl = getSafeServiceUrl(chainId);
  if (!txServiceUrl) {
    throw new Error(
      `Safe Transaction Service is not available for ${NETWORKS[chainId].name}. ` +
        `Please use a chain with Safe Transaction Service support.`
    );
  }

  console.log("Using Safe Transaction Service URL:", txServiceUrl);

  try {
    // Create provider that can handle signing
    const provider = createEthereumProvider(walletClient, chainId);
    const signerAddress = walletClient.account.address;

    const safe = await Safe.init({
      provider,
      signer: signerAddress,
      safeAddress,
    });

    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
      txServiceUrl,
    });

    // Check if the Safe is indexed by the Transaction Service
    try {
      await apiKit.getSafeInfo(safeAddress);
    } catch (infoError: any) {
      const is404 =
        infoError?.response?.status === 404 ||
        infoError?.message?.includes("404") ||
        infoError?.message?.includes("Not Found");

      if (is404) {
        throw new Error(
          `This Safe wallet is not yet indexed by Safe's Transaction Service. ` +
            `Please go to https://app.safe.global and add your Safe wallet there first, ` +
            `then try again.`
        );
      }
      console.warn("Could not verify Safe indexing status:", infoError);
    }

    // Prepare the transaction
    const { safeTx, totalRecipients, totalAmount } = await prepareDisbursementTransaction(
      safeAddress,
      recipients,
      tokenAddress,
      chainId,
      decimals
    );

    // Get transaction hash
    const txHash = await safe.getTransactionHash(safeTx);

    // Check if the signer is an owner of the Safe
    const owners = await safe.getOwners();
    const isOwner = owners.some((owner) => owner.toLowerCase() === signerAddress.toLowerCase());
    console.log("Is signer an owner?", isOwner);

    // Check if user is a delegate (can propose even if not owner)
    let isDelegate = false;
    try {
      const delegatesResponse = await fetch(
        `${txServiceUrl}/api/v1/delegates/?safe=${safeAddress}&delegate=${signerAddress}`
      );
      if (delegatesResponse.ok) {
        const delegatesData = await delegatesResponse.json();
        isDelegate = delegatesData.count > 0;
      }
      console.log("Is signer a delegate?", isDelegate);
    } catch (e) {
      console.warn("Could not check delegate status:", e);
    }

    // For proposing via SDK, the signer should be an owner or delegate
    // The SDK's proposeTransaction handles the API call properly
    if (!isOwner && !isDelegate) {
      console.warn("User is neither owner nor delegate - attempting to propose anyway...");
    }

    // Sign the transaction hash using signHash (as per SDK documentation)
    // This works for both owners and delegates
    console.log("Signing transaction hash...");
    const signature = await safe.signHash(txHash).catch((signError: unknown) => {
      const errorMessage =
        signError instanceof Error ? signError.message : "User rejected or wallet error";
      console.error("Failed to sign transaction hash:", signError);
      throw new Error(
        `Failed to sign transaction: ${errorMessage}. ` +
          `Please try again and approve the signature request in your wallet.`
      );
    });
    console.log("Transaction hash signed successfully");

    // Propose the transaction using direct API call
    // Note: Safe API Kit ignores txServiceUrl and uses api.safe.global which returns 404
    // So we use direct fetch to the correct URL: safe-transaction-{network}.safe.global
    const proposalUrl = `${txServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/`;
    console.log("Proposing transaction to:", proposalUrl);

    const proposalBody = {
      to: safeTx.data.to,
      value: safeTx.data.value,
      data: safeTx.data.data,
      operation: safeTx.data.operation,
      safeTxGas: String(safeTx.data.safeTxGas),
      baseGas: String(safeTx.data.baseGas),
      gasPrice: String(safeTx.data.gasPrice),
      gasToken: safeTx.data.gasToken,
      refundReceiver: safeTx.data.refundReceiver,
      nonce: safeTx.data.nonce,
      contractTransactionHash: txHash,
      sender: signerAddress,
      signature: signature.data,
      origin: "GAP Disbursement",
    };

    console.log("Proposal body:", JSON.stringify(proposalBody, null, 2));

    try {
      const response = await fetch(proposalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(proposalBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transaction proposal failed:", response.status, errorText);

        if (response.status === 404) {
          throw new Error(
            `Safe not found on the Transaction Service. Please open your Safe at https://app.safe.global first.`
          );
        }

        if (response.status === 400 || response.status === 422) {
          let errorDetails = errorText;
          try {
            const errorData = JSON.parse(errorText);
            errorDetails =
              errorData?.nonFieldErrors?.join(", ") ||
              errorData?.signature?.join(", ") ||
              errorData?.message ||
              errorData?.detail ||
              JSON.stringify(errorData);
          } catch {
            // Use raw error text
          }
          throw new Error(`Transaction validation failed: ${errorDetails}`);
        }

        throw new Error(`Failed to propose transaction: ${response.status} ${response.statusText}`);
      }

      console.log("Transaction successfully proposed to Safe Transaction Service");
    } catch (apiError: unknown) {
      if (apiError instanceof Error) {
        throw apiError;
      }
      throw new Error(`Failed to propose transaction: ${String(apiError)}`);
    }

    // Use the network shortName for Safe URL (e.g., "base", "oeth", "arb1")
    const networkShortName = NETWORKS[chainId].shortName;

    return {
      txHash,
      safeTxHash: txHash,
      totalRecipients,
      totalAmount,
      safeUrl: `https://app.safe.global/transactions/tx?safe=${networkShortName}:${safeAddress}&id=multisig_${safeAddress}_${txHash}`,
      executed: false, // Always false - we never execute, only propose
    };
  } catch (error) {
    console.error("Error in signAndProposeDisbursement:", {
      message: error instanceof Error ? error.message : "Unknown error",
      safeAddress,
      chainId,
      recipientCount: recipients.length,
    });

    if (error instanceof Error) {
      throw error; // Re-throw as-is to preserve the message
    }
    throw new Error("Transaction failed with unknown error");
  }
}

/**
 * Gets the execution status of a Safe transaction from the Safe Transaction Service
 *
 * @param safeTxHash - The Safe transaction hash (not the on-chain tx hash)
 * @param chainId - The chain ID where the Safe is deployed
 * @returns Transaction status including execution state and confirmation count
 *
 * @example
 * ```typescript
 * const status = await getTransactionStatus(
 *   "0x1234...abcd",
 *   10 // Optimism
 * );
 *
 * if (status.isExecuted && status.isSuccessful) {
 *   console.log("Transaction executed successfully!");
 * }
 * ```
 */
export async function getTransactionStatus(
  safeTxHash: string,
  chainId: SupportedChainId
): Promise<SafeTransactionStatus> {
  const txServiceUrl = getSafeServiceUrl(chainId);

  if (!txServiceUrl) {
    throw new Error(`Safe Transaction Service not available for chain ${chainId}`);
  }

  try {
    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
      txServiceUrl,
    });

    const tx = await apiKit.getTransaction(safeTxHash);

    return {
      isExecuted: tx.isExecuted,
      isSuccessful: tx.isSuccessful,
      transactionHash: tx.transactionHash,
      executionDate: tx.executionDate,
      confirmationsRequired: tx.confirmationsRequired,
      confirmationsSubmitted: tx.confirmations?.length ?? 0,
    };
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    throw new Error(
      `Failed to fetch transaction status: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Gas fee estimation result
 */
export interface GasEstimation {
  /** Estimated gas in wei */
  gasEstimate: bigint;
  /** Current gas price in wei */
  gasPrice: bigint;
  /** Total estimated fee in wei */
  totalFeeWei: bigint;
  /** Total estimated fee formatted in native token */
  totalFeeFormatted: string;
  /** Native token symbol (ETH, CELO, MATIC, etc.) */
  nativeTokenSymbol: string;
  /** USD equivalent of the fee (null if price fetch failed) */
  totalFeeUSD: string | null;
}

/**
 * Fetches native token price in USD from CoinGecko
 */
async function fetchNativeTokenPrice(coingeckoId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`CoinGecko API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data[coingeckoId]?.usd ?? null;
  } catch (error) {
    console.warn("Failed to fetch native token price:", error);
    return null;
  }
}

/**
 * Estimates gas fee for a batched disbursement transaction
 *
 * @param safeAddress - The Safe wallet address
 * @param recipients - Array of recipients with addresses and amounts
 * @param tokenAddress - The ERC20 token contract address, or null for native token transfers
 * @param chainId - The chain ID to execute on
 * @param decimals - Token decimals (default: 18 for native tokens)
 * @returns Gas estimation with native token and USD values
 */
export async function estimateGasFee(
  safeAddress: string,
  recipients: DisbursementRecipient[],
  tokenAddress: string | null,
  chainId: SupportedChainId,
  decimals: number = 18
): Promise<GasEstimation> {
  const publicClient = await getRPCClient(chainId);
  const nativeToken = NATIVE_TOKENS[chainId];
  const rpcUrl = NETWORKS[chainId].rpcUrl;

  // Get token decimals - try fetching from contract if token address provided
  let effectiveDecimals = decimals;
  if (tokenAddress) {
    try {
      effectiveDecimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      });
    } catch {
      // Use provided decimals if fetch fails
      console.warn("Failed to fetch token decimals for gas estimation, using provided value");
    }
  }

  // Filter valid recipients
  const validRecipients = recipients.filter((r) => !r.error);

  if (validRecipients.length === 0) {
    throw new Error("No valid recipients for gas estimation");
  }

  // Initialize Safe SDK for transaction preparation
  const safe = await Safe.init({
    provider: rpcUrl,
    safeAddress,
  });

  // Create individual transfer transactions
  const transactions = validRecipients.map((recipient) => {
    const amount = parseUnits(recipient.amount, effectiveDecimals);

    // Native token transfer (no token address)
    if (!tokenAddress) {
      return {
        to: recipient.address,
        value: amount.toString(),
        data: "0x" as const,
      };
    }

    // ERC20 token transfer
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient.address as `0x${string}`, amount],
    });

    return {
      to: tokenAddress,
      value: "0",
      data,
    };
  });

  // Create the batched Safe transaction to estimate
  const safeTx = await safe.createTransaction({ transactions });

  // Estimate gas using the Safe SDK
  // The Safe transaction includes safeTxGas (internal gas) and we also need base gas
  const safeTxGas = BigInt(safeTx.data.safeTxGas || 0);
  const baseGas = BigInt(safeTx.data.baseGas || 0);

  // Also estimate the actual execution gas
  // For a multi-call, estimate based on individual transfers
  // Each ERC20 transfer typically uses ~65,000 gas
  const estimatedGasPerTransfer = BigInt(65000);
  const safeExecutionOverhead = BigInt(50000); // Safe execution overhead
  const perRecipientOverhead = BigInt(5000); // Additional overhead per recipient in batch

  // Calculate total estimated gas
  let gasEstimate: bigint;

  if (safeTxGas > BigInt(0)) {
    // Use Safe SDK estimation if available
    gasEstimate = safeTxGas + baseGas + safeExecutionOverhead;
  } else {
    // Fallback to manual estimation
    gasEstimate =
      safeExecutionOverhead +
      BigInt(validRecipients.length) * (estimatedGasPerTransfer + perRecipientOverhead);
  }

  // Get current gas price
  const gasPrice = await publicClient.getGasPrice();

  // Calculate total fee in wei
  const totalFeeWei = gasEstimate * gasPrice;

  // Format the fee in native token
  const totalFeeFormatted = formatUnits(totalFeeWei, nativeToken.decimals);

  // Fetch USD price
  const nativeTokenPriceUSD = await fetchNativeTokenPrice(nativeToken.coingeckoId);
  let totalFeeUSD: string | null = null;

  if (nativeTokenPriceUSD !== null) {
    const feeInNative = parseFloat(totalFeeFormatted);
    const feeUSD = feeInNative * nativeTokenPriceUSD;
    totalFeeUSD = feeUSD.toFixed(2);
  }

  return {
    gasEstimate,
    gasPrice,
    totalFeeWei,
    totalFeeFormatted,
    nativeTokenSymbol: nativeToken.symbol,
    totalFeeUSD,
  };
}
