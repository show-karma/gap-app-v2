import type { Address, PublicClient, WalletClient } from "viem";

// Standard ERC20 ABI for allowance and approve functions
export const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TokenApprovalInfo {
  tokenAddress: Address;
  tokenSymbol: string;
  currentAllowance: bigint;
  requiredAmount: bigint;
  needsApproval: boolean;
  chainId: number;
}

export interface ApprovalTransaction {
  tokenAddress: Address;
  tokenSymbol: string;
  amount: bigint;
  hash?: string;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Check the current allowance for a specific token
 */
export async function checkTokenAllowance(
  publicClient: PublicClient,
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> {
  try {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });

    return allowance as bigint;
  } catch (error) {
    console.error(`Failed to check allowance for token ${tokenAddress}:`, error);
    return 0n;
  }
}

/**
 * Check allowances for multiple tokens and determine which need approval
 */
export async function checkTokenAllowances(
  publicClient: PublicClient,
  ownerAddress: Address,
  spenderAddress: Address,
  tokenRequirements: Array<{
    tokenAddress: Address;
    tokenSymbol: string;
    requiredAmount: bigint;
    chainId?: number;
  }>,
  chainId?: number
): Promise<TokenApprovalInfo[]> {
  const allowanceChecks = tokenRequirements.map(async (req) => {
    const currentAllowance = await checkTokenAllowance(
      publicClient,
      req.tokenAddress,
      ownerAddress,
      spenderAddress
    );

    return {
      tokenAddress: req.tokenAddress,
      tokenSymbol: req.tokenSymbol,
      currentAllowance,
      requiredAmount: req.requiredAmount,
      needsApproval: currentAllowance < req.requiredAmount,
      chainId: req.chainId ?? chainId ?? publicClient.chain?.id ?? 0,
    };
  });

  return Promise.all(allowanceChecks);
}

/**
 * Execute approve transaction for a single token
 */
export async function approveToken(
  walletClient: WalletClient,
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint,
  account: Address
): Promise<string> {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spenderAddress, amount],
    account,
    chain: null,
  });

  return hash;
}

/**
 * Execute multiple approval transactions
 */
export async function executeApprovals(
  walletClient: WalletClient,
  publicClient: PublicClient,
  account: Address,
  spenderAddress: Address,
  approvals: Array<{
    tokenAddress: Address;
    tokenSymbol: string;
    amount: bigint;
  }>,
  onProgress?: (progress: ApprovalTransaction[]) => void
): Promise<ApprovalTransaction[]> {
  const results: ApprovalTransaction[] = [];

  for (const approval of approvals) {
    try {
      // Execute approval transaction
      const hash = await approveToken(
        walletClient,
        approval.tokenAddress,
        spenderAddress,
        approval.amount,
        account
      );

      const transaction: ApprovalTransaction = {
        tokenAddress: approval.tokenAddress,
        tokenSymbol: approval.tokenSymbol,
        amount: approval.amount,
        hash,
        status: "pending",
      };

      results.push(transaction);
      onProgress?.(results);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      // Update status based on receipt
      transaction.status = receipt.status === "success" ? "confirmed" : "failed";
      onProgress?.(results);

      if (receipt.status !== "success") {
        throw new Error(`Approval transaction failed for ${approval.tokenSymbol}`);
      }
    } catch (error) {
      console.error(`Failed to approve ${approval.tokenSymbol}:`, error);

      const failedTransaction: ApprovalTransaction = {
        tokenAddress: approval.tokenAddress,
        tokenSymbol: approval.tokenSymbol,
        amount: approval.amount,
        status: "failed",
      };

      results.push(failedTransaction);
      onProgress?.(results);

      throw error;
    }
  }

  return results;
}

/**
 * Get the maximum safe approval amount (use max uint256 for unlimited approval)
 *
 * SECURITY NOTE - Unlimited Approvals (MAX_UINT256):
 * - This implementation uses unlimited approvals for better UX (one-time approval)
 * - This is an acceptable security tradeoff because:
 *   1. We're approving to Uniswap's Permit2 contract (audited, battle-tested)
 *   2. Permit2 requires explicit per-transaction signatures, preventing unauthorized transfers
 *   3. Even with unlimited approval, funds can only be transferred via signed permits
 *   4. This is the same pattern used by Uniswap, 1inch, and other major DeFi protocols
 *
 * Alternative: Set useExactAmount=true to approve only the required amount (worse UX, requires approval for each transaction)
 */
export const MAX_UINT256 = 2n ** 256n - 1n;

/**
 * Helper to determine approval amount strategy
 * @param requiredAmount - The minimum amount needed for the transaction
 * @param useExactAmount - If true, approves exact amount; if false, approves MAX_UINT256 for better UX
 * @returns The approval amount to use
 */
export function getApprovalAmount(requiredAmount: bigint, useExactAmount = false): bigint {
  return useExactAmount ? requiredAmount : MAX_UINT256;
}
