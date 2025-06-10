import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { erc20Abi, formatUnits, parseUnits, encodeFunctionData } from "viem";
import { NETWORKS, TOKEN_ADDRESSES, SupportedChainId } from "../config/tokens";
import { DisbursementRecipient } from "../types/disbursement";
import { getRPCClient } from "./rpcClient";

// Safe Transaction Service URLs
const SAFE_SERVICE_URLS = {
  42220: "https://safe-transaction-celo.safe.global",
  42161: "https://safe-transaction-arbitrum.safe.global",
  10: "https://safe-transaction-optimism.safe.global",
} as const;

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
    return owners.some(
      (owner) => owner.toLowerCase() === signerAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Error checking Safe ownership:", error);
    return false;
  }
}

/**
 * Fetches the USDC balance of the specified Safe
 */
export async function getSafeTokenBalance(
  safeAddress: string,
  tokenSymbol: "usdc",
  chainId: SupportedChainId
): Promise<{
  balance: string;
  balanceFormatted: string;
  decimals: number;
}> {
  try {
    const publicClient = await getRPCClient(chainId);
    const tokenAddress = TOKEN_ADDRESSES[tokenSymbol][chainId];

    // Get token balance
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
 */
export async function prepareDisbursementTransaction(
  safeAddress: string,
  recipients: DisbursementRecipient[],
  tokenSymbol: "usdc",
  chainId: SupportedChainId
) {
  try {
    const rpcUrl = NETWORKS[chainId].rpcUrl;
    const tokenAddress = TOKEN_ADDRESSES[tokenSymbol][chainId];

    // Initialize Safe SDK
    const safe = await Safe.init({
      provider: rpcUrl,
      safeAddress,
    });

    // Get token decimals
    const publicClient = await getRPCClient(chainId);
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    });

    // Create individual transfer transactions
    const transactions = recipients
      .filter((recipient) => !recipient.error) // Only include valid recipients
      .map((recipient) => {
        // Convert amount to wei units based on token decimals
        const amount = parseUnits(recipient.amount, decimals);

        // Encode the transfer function call
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
      console.log(`Provider request: ${method}`, params);

      try {
        // Handle signing methods through wallet client
        if (method === "eth_sendTransaction") {
          console.log("Handling eth_sendTransaction through wallet client");
          return await walletClient.sendTransaction(params[0]);
        }

        if (method === "eth_signTransaction") {
          console.log("Handling eth_signTransaction through wallet client");
          return await walletClient.signTransaction(params[0]);
        }

        if (
          method === "eth_signTypedData_v4" ||
          method === "eth_signTypedData"
        ) {
          console.log("Handling eth_signTypedData through wallet client");
          console.log("TypedData params:", params);

          // params[0] is the address, params[1] is the typed data
          const [address, typedData] = params;

          // Parse the typed data if it's a string
          const parsedTypedData =
            typeof typedData === "string" ? JSON.parse(typedData) : typedData;

          console.log("Parsed typed data:", parsedTypedData);

          // Verify the address matches the wallet client account
          if (
            address?.toLowerCase() !==
            walletClient.account?.address?.toLowerCase()
          ) {
            throw new Error(
              `Address mismatch: ${address} vs ${walletClient.account?.address}`
            );
          }

          return await walletClient.signTypedData({
            domain: parsedTypedData.domain,
            types: parsedTypedData.types,
            primaryType: parsedTypedData.primaryType,
            message: parsedTypedData.message,
          });
        }

        if (method === "personal_sign") {
          console.log("Handling personal_sign through wallet client");
          console.log("Personal sign params:", params);

          // params[0] is the message, params[1] is the address
          const [message, address] = params;

          // Verify the address matches the wallet client account
          if (
            address?.toLowerCase() !==
            walletClient.account?.address?.toLowerCase()
          ) {
            throw new Error(
              `Address mismatch: ${address} vs ${walletClient.account?.address}`
            );
          }

          return await walletClient.signMessage({
            message:
              typeof message === "string" && message.startsWith("0x")
                ? { raw: message }
                : message,
          });
        }

        // Handle account access
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          const accounts = [walletClient.account?.address].filter(Boolean);
          console.log("Returning accounts:", accounts);
          return accounts;
        }

        // Handle chain ID
        if (method === "eth_chainId") {
          const chainIdHex = `0x${chainId.toString(16)}`;
          console.log("Returning chainId:", chainIdHex);
          return chainIdHex;
        }

        // For other methods, fall back to RPC
        console.log(`Falling back to RPC for method: ${method}`);
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
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
  };
}

/**
 * Signs and proposes a disbursement transaction to the Safe
 */
export async function signAndProposeDisbursement(
  safeAddress: string,
  recipients: DisbursementRecipient[],
  tokenSymbol: "usdc",
  chainId: SupportedChainId,
  walletClient: any // The wallet client from wagmi
) {
  console.log("Starting disbursement transaction...", {
    safeAddress,
    recipientCount: recipients.length,
    chainId,
    walletClientAccount: walletClient?.account?.address,
  });

  try {
    // Validate inputs
    if (!walletClient?.account?.address) {
      throw new Error("Wallet client is not properly connected");
    }

    if (!safeAddress || !recipients.length) {
      throw new Error("Missing required parameters");
    }

    console.log("Creating Safe SDK instance...");
    // Create provider that can handle signing
    const provider = createEthereumProvider(walletClient, chainId);

    const safe = await Safe.init({
      provider,
      signer: walletClient.account.address,
      safeAddress,
    });

    console.log("Initializing API Kit...");
    // Initialize API Kit
    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
      txServiceUrl: SAFE_SERVICE_URLS[chainId],
    });

    console.log("Preparing transaction...");
    // Prepare the transaction
    const { safeTx, totalRecipients, totalAmount } =
      await prepareDisbursementTransaction(
        safeAddress,
        recipients,
        tokenSymbol,
        chainId
      );

    console.log("Signing transaction...");
    // Sign the transaction
    const signedTx = await safe.signTransaction(safeTx);

    console.log("Getting transaction hash...");
    // Get transaction hash
    const txHash = await safe.getTransactionHash(signedTx);

    console.log("Getting signer address...");
    // Get signer address
    const signerAddress = walletClient.account.address;
    console.log("Signer address:", signerAddress);

    // Get signature
    const signature = signedTx.signatures.get(signerAddress.toLowerCase());
    if (!signature) {
      console.error(
        "Available signatures:",
        Array.from(signedTx.signatures.keys())
      );
      throw new Error("Unable to get signature for signer address");
    }

    console.log("Proposing transaction to Safe Transaction Service...");
    console.log("Proposal data:", {
      safeAddress,
      safeTxHash: txHash,
      senderAddress: signerAddress,
      serviceUrl: SAFE_SERVICE_URLS[chainId],
    });

    try {
      // First, try to execute the transaction directly
      console.log("Attempting direct transaction execution...");
      const executeTxResponse = await safe.executeTransaction(signedTx);

      // Try to wait for transaction confirmation if possible
      let receipt;
      try {
        if (executeTxResponse.transactionResponse) {
          receipt = await (
            executeTxResponse.transactionResponse as any
          ).wait?.();
        }
      } catch (waitError) {
        console.warn("Failed to wait for transaction confirmation:", waitError);
      }

      const finalTxHash =
        receipt?.transactionHash || executeTxResponse.hash || txHash;

      console.log("Transaction executed successfully!", {
        txHash: finalTxHash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
      });

      return {
        txHash: finalTxHash,
        totalRecipients,
        totalAmount,
        safeUrl: `https://app.safe.global/transactions/tx?safe=${NETWORKS[
          chainId
        ].name.toLowerCase()}:${safeAddress}&id=${finalTxHash}`,
        executed: true,
      };
    } catch (executionError) {
      console.error("Direct execution failed:", {
        error: executionError,
        message:
          executionError instanceof Error
            ? executionError.message
            : "Unknown execution error",
      });

      // If direct execution fails, fall back to proposing the transaction
      try {
        console.log(
          "Falling back to proposing transaction to Safe Transaction Service..."
        );
        const proposalResult = await apiKit.proposeTransaction({
          safeAddress,
          safeTransactionData: signedTx.data,
          safeTxHash: txHash,
          senderAddress: signerAddress,
          senderSignature: signature.data,
        });
        console.log("Transaction proposed successfully!", proposalResult);
      } catch (apiError) {
        console.error("Failed to propose transaction to Safe service:", {
          error: apiError,
          message:
            apiError instanceof Error ? apiError.message : "Unknown API error",
          stack: apiError instanceof Error ? apiError.stack : undefined,
          serviceUrl: SAFE_SERVICE_URLS[chainId],
          safeAddress,
          txHash,
          signerAddress,
        });

        // Check if it's a network/fetch error vs a validation error
        if (apiError instanceof Error) {
          if (
            apiError.message.includes("Failed to fetch") ||
            apiError.message.includes("fetch")
          ) {
            console.warn(
              "Network connectivity issue with Safe Transaction Service"
            );
            console.warn(
              "The transaction is signed and can be executed manually in the Safe app"
            );
            // Don't throw - just continue
          } else if (
            apiError.message.includes("Invalid") ||
            apiError.message.includes("already exists")
          ) {
            console.warn("Safe service validation issue:", apiError.message);
            // Don't throw - just continue
          } else {
            // For other errors, still continue but log them
            console.warn("Unexpected Safe service error:", apiError.message);
          }
        }

        console.log(
          "Continuing despite Safe service error - transaction is signed and ready"
        );
      }
    }

    return {
      txHash,
      totalRecipients,
      totalAmount,
      safeUrl: `https://app.safe.global/transactions/tx?safe=${NETWORKS[
        chainId
      ].name.toLowerCase()}:${safeAddress}&id=multisig_${safeAddress}_${txHash}`,
      // Include transaction data for manual submission
      transactionData: {
        safe: safeAddress,
        to: signedTx.data.to,
        value: signedTx.data.value,
        data: signedTx.data.data,
        operation: signedTx.data.operation,
        safeTxGas: signedTx.data.safeTxGas,
        baseGas: signedTx.data.baseGas,
        gasPrice: signedTx.data.gasPrice,
        gasToken: signedTx.data.gasToken,
        refundReceiver: signedTx.data.refundReceiver,
        nonce: signedTx.data.nonce,
        safeTxHash: txHash,
        signatures: signedTx.signatures,
      },
      // Direct Safe app URL for creating new transaction
      createTxUrl: `https://app.safe.global/home?safe=${NETWORKS[
        chainId
      ].name.toLowerCase()}:${safeAddress}`,
    };
  } catch (error) {
    console.error("Detailed error in signAndProposeDisbursement:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      safeAddress,
      chainId,
      recipientCount: recipients.length,
      step: "unknown",
    });

    // Re-throw with more specific error message
    if (error instanceof Error) {
      throw new Error(`Transaction failed: ${error.message}`);
    } else {
      throw new Error("Transaction failed with unknown error");
    }
  }
}
