/**
 * Integration Tests for ERC20 Approval Flow
 *
 * Tests the REAL functions from utilities/erc20.ts:
 * - checkTokenAllowance
 * - checkTokenAllowances
 * - executeApprovals
 * - getApprovalAmount / MAX_UINT256
 *
 * Blockchain-level deps (viem PublicClient, WalletClient) are mocked,
 * but the erc20.ts functions themselves run as production code.
 */

import type { Address, PublicClient, WalletClient } from "viem";
import {
  type ApprovalTransaction,
  checkTokenAllowance,
  checkTokenAllowances,
  executeApprovals,
  getApprovalAmount,
  MAX_UINT256,
} from "@/utilities/erc20";

// ---------------------------------------------------------------------------
// Mock clients
// ---------------------------------------------------------------------------

function createMockPublicClient(
  overrides?: Partial<{
    readContract: ReturnType<typeof vi.fn>;
    waitForTransactionReceipt: ReturnType<typeof vi.fn>;
    chain: { id: number };
  }>
) {
  return {
    chain: { id: 10 },
    readContract: vi.fn().mockResolvedValue(0n),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    ...overrides,
  } as unknown as PublicClient;
}

function createMockWalletClient(
  overrides?: Partial<{
    writeContract: ReturnType<typeof vi.fn>;
    account: { address: Address };
    chain: { id: number };
  }>
) {
  return {
    account: { address: "0xOwner0000000000000000000000000000000000" as Address },
    chain: { id: 10 },
    writeContract: vi.fn().mockResolvedValue("0xapprove_tx_hash"),
    ...overrides,
  } as unknown as WalletClient;
}

const OWNER = "0xOwner0000000000000000000000000000000000" as Address;
const SPENDER = "0xSpender00000000000000000000000000000000" as Address;
const TOKEN_A = "0xTokenA0000000000000000000000000000000000" as Address;
const TOKEN_B = "0xTokenB0000000000000000000000000000000000" as Address;

// ---------------------------------------------------------------------------
// checkTokenAllowance
// ---------------------------------------------------------------------------

describe("checkTokenAllowance()", () => {
  it("returns the allowance from the contract", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(500_000n),
    });

    const allowance = await checkTokenAllowance(publicClient, TOKEN_A, OWNER, SPENDER);

    expect(allowance).toBe(500_000n);
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TOKEN_A,
        functionName: "allowance",
        args: [OWNER, SPENDER],
      })
    );
  });

  it("returns 0n when readContract throws (e.g. invalid token)", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockRejectedValue(new Error("execution reverted")),
    });

    const allowance = await checkTokenAllowance(publicClient, TOKEN_A, OWNER, SPENDER);
    expect(allowance).toBe(0n);
  });

  it("returns 0n for a fresh token with no prior approval", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(0n),
    });

    const allowance = await checkTokenAllowance(publicClient, TOKEN_A, OWNER, SPENDER);
    expect(allowance).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// checkTokenAllowances (batch)
// ---------------------------------------------------------------------------

describe("checkTokenAllowances()", () => {
  it("returns needsApproval=false when allowance >= required", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(1_000_000n),
    });

    const results = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 500_000n },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].needsApproval).toBe(false);
    expect(results[0].currentAllowance).toBe(1_000_000n);
  });

  it("returns needsApproval=true when allowance < required", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(100n),
    });

    const results = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 500_000n },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].needsApproval).toBe(true);
    expect(results[0].requiredAmount).toBe(500_000n);
  });

  it("handles multiple tokens with mixed approval needs", async () => {
    const readContract = vi.fn();
    // First call: TOKEN_A has sufficient allowance
    readContract.mockResolvedValueOnce(1_000_000n);
    // Second call: TOKEN_B has zero allowance
    readContract.mockResolvedValueOnce(0n);

    const publicClient = createMockPublicClient({ readContract });

    const results = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 500_000n },
      { tokenAddress: TOKEN_B, tokenSymbol: "DAI", requiredAmount: 1_000_000n },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].needsApproval).toBe(false);
    expect(results[1].needsApproval).toBe(true);
  });

  it("includes chainId from the parameter", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(0n),
    });

    const results = await checkTokenAllowances(
      publicClient,
      OWNER,
      SPENDER,
      [{ tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 100n }],
      42161
    );

    expect(results[0].chainId).toBe(42161);
  });

  it("uses per-token chainId when provided", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(0n),
    });

    const results = await checkTokenAllowances(
      publicClient,
      OWNER,
      SPENDER,
      [{ tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 100n, chainId: 8453 }],
      10 // fallback
    );

    expect(results[0].chainId).toBe(8453);
  });

  it("returns empty array for empty requirements", async () => {
    const publicClient = createMockPublicClient();
    const results = await checkTokenAllowances(publicClient, OWNER, SPENDER, []);
    expect(results).toEqual([]);
  });

  it("handles readContract failure for one token without blocking others", async () => {
    const readContract = vi.fn();
    readContract.mockResolvedValueOnce(1_000_000n); // TOKEN_A ok
    readContract.mockRejectedValueOnce(new Error("revert")); // TOKEN_B fails

    const publicClient = createMockPublicClient({ readContract });

    const results = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 100n },
      { tokenAddress: TOKEN_B, tokenSymbol: "DAI", requiredAmount: 100n },
    ]);

    expect(results).toHaveLength(2);
    // TOKEN_A should be fine
    expect(results[0].needsApproval).toBe(false);
    // TOKEN_B: checkTokenAllowance returns 0n on error, so needsApproval = true
    expect(results[1].needsApproval).toBe(true);
    expect(results[1].currentAllowance).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// executeApprovals
// ---------------------------------------------------------------------------

describe("executeApprovals()", () => {
  it("executes approve for each token and returns confirmed results", async () => {
    const walletClient = createMockWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xhash_a"),
    });
    const publicClient = createMockPublicClient({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    });

    const results = await executeApprovals(walletClient, publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 1_000_000n },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("confirmed");
    expect(results[0].hash).toBe("0xhash_a");
    expect(results[0].tokenSymbol).toBe("USDC");
  });

  it("processes multiple approvals sequentially", async () => {
    const writeContract = vi.fn();
    writeContract.mockResolvedValueOnce("0xhash_a");
    writeContract.mockResolvedValueOnce("0xhash_b");

    const walletClient = createMockWalletClient({ writeContract });
    const publicClient = createMockPublicClient({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    });

    const results = await executeApprovals(walletClient, publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 500_000n },
      { tokenAddress: TOKEN_B, tokenSymbol: "DAI", amount: 1_000_000n },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].tokenSymbol).toBe("USDC");
    expect(results[1].tokenSymbol).toBe("DAI");
    expect(writeContract).toHaveBeenCalledTimes(2);
  });

  it("calls onProgress callback after each approval step", async () => {
    const walletClient = createMockWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xhash"),
    });
    const publicClient = createMockPublicClient({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    });

    const progressCalls: ApprovalTransaction[][] = [];

    await executeApprovals(
      walletClient,
      publicClient,
      OWNER,
      SPENDER,
      [{ tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 100n }],
      (progress) => {
        progressCalls.push([...progress]);
      }
    );

    // Should be called at least twice: once after tx sent (pending), once after confirmed
    expect(progressCalls.length).toBeGreaterThanOrEqual(2);
    // Last call should have confirmed status
    const lastCall = progressCalls[progressCalls.length - 1];
    expect(lastCall[0].status).toBe("confirmed");
  });

  it("throws and marks as failed when user rejects approval", async () => {
    const walletClient = createMockWalletClient({
      writeContract: vi.fn().mockRejectedValue(new Error("User rejected the request")),
    });
    const publicClient = createMockPublicClient();

    const progressCalls: ApprovalTransaction[][] = [];

    await expect(
      executeApprovals(
        walletClient,
        publicClient,
        OWNER,
        SPENDER,
        [{ tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 100n }],
        (progress) => {
          progressCalls.push([...progress]);
        }
      )
    ).rejects.toThrow("User rejected");

    // onProgress should have been called with failed status
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);
    const lastCall = progressCalls[progressCalls.length - 1];
    expect(lastCall[0].status).toBe("failed");
  });

  it("throws when approval transaction reverts on-chain", async () => {
    const walletClient = createMockWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xreverted_hash"),
    });
    const publicClient = createMockPublicClient({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "reverted" }),
    });

    await expect(
      executeApprovals(walletClient, publicClient, OWNER, SPENDER, [
        { tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 100n },
      ])
    ).rejects.toThrow("Approval transaction failed for USDC");
  });

  it("stops processing remaining approvals after first failure", async () => {
    const writeContract = vi.fn();
    writeContract.mockRejectedValueOnce(new Error("User rejected"));
    writeContract.mockResolvedValueOnce("0xhash_b"); // should never be called

    const walletClient = createMockWalletClient({ writeContract });
    const publicClient = createMockPublicClient();

    await expect(
      executeApprovals(walletClient, publicClient, OWNER, SPENDER, [
        { tokenAddress: TOKEN_A, tokenSymbol: "USDC", amount: 100n },
        { tokenAddress: TOKEN_B, tokenSymbol: "DAI", amount: 200n },
      ])
    ).rejects.toThrow();

    // Second token approval should not have been attempted
    expect(writeContract).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no approvals are needed", async () => {
    const walletClient = createMockWalletClient();
    const publicClient = createMockPublicClient();

    const results = await executeApprovals(walletClient, publicClient, OWNER, SPENDER, []);

    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getApprovalAmount / MAX_UINT256
// ---------------------------------------------------------------------------

describe("getApprovalAmount()", () => {
  it("returns MAX_UINT256 when useExactAmount is false (default)", () => {
    const result = getApprovalAmount(1_000_000n);
    expect(result).toBe(MAX_UINT256);
  });

  it("returns MAX_UINT256 when useExactAmount is explicitly false", () => {
    const result = getApprovalAmount(1_000_000n, false);
    expect(result).toBe(MAX_UINT256);
  });

  it("returns the exact required amount when useExactAmount is true", () => {
    const required = 1_000_000n;
    const result = getApprovalAmount(required, true);
    expect(result).toBe(required);
  });

  it("MAX_UINT256 equals 2^256 - 1", () => {
    expect(MAX_UINT256).toBe(2n ** 256n - 1n);
  });
});

// ---------------------------------------------------------------------------
// Full integration: check then execute
// ---------------------------------------------------------------------------

describe("full approval integration: check allowances then execute approvals", () => {
  it("skips execution when all tokens have sufficient allowance", async () => {
    const publicClient = createMockPublicClient({
      readContract: vi.fn().mockResolvedValue(10_000_000n),
    });
    const walletClient = createMockWalletClient();

    const checkResults = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 1_000_000n },
      { tokenAddress: TOKEN_B, tokenSymbol: "DAI", requiredAmount: 5_000_000n },
    ]);

    const needsApproval = checkResults.filter((r) => r.needsApproval);
    expect(needsApproval).toHaveLength(0);

    // No executeApprovals needed
    const approvals = await executeApprovals(walletClient, publicClient, OWNER, SPENDER, []);
    expect(approvals).toEqual([]);
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it("executes approvals only for tokens that need it", async () => {
    const readContract = vi.fn();
    readContract.mockResolvedValueOnce(10_000_000n); // TOKEN_A: sufficient
    readContract.mockResolvedValueOnce(0n); // TOKEN_B: needs approval

    const publicClient = createMockPublicClient({
      readContract,
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    });

    const walletClient = createMockWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xapproval_hash"),
    });

    // Step 1: Check
    const checkResults = await checkTokenAllowances(publicClient, OWNER, SPENDER, [
      { tokenAddress: TOKEN_A, tokenSymbol: "USDC", requiredAmount: 1_000_000n },
      { tokenAddress: TOKEN_B, tokenSymbol: "DAI", requiredAmount: 5_000_000n },
    ]);

    const tokensNeedingApproval = checkResults.filter((r) => r.needsApproval);
    expect(tokensNeedingApproval).toHaveLength(1);
    expect(tokensNeedingApproval[0].tokenSymbol).toBe("DAI");

    // Step 2: Execute only for DAI
    const approvalRequests = tokensNeedingApproval.map((info) => ({
      tokenAddress: info.tokenAddress,
      tokenSymbol: info.tokenSymbol,
      amount: getApprovalAmount(info.requiredAmount, false),
    }));

    const approvalResults = await executeApprovals(
      walletClient,
      publicClient,
      OWNER,
      SPENDER,
      approvalRequests
    );

    expect(approvalResults).toHaveLength(1);
    expect(approvalResults[0].tokenSymbol).toBe("DAI");
    expect(approvalResults[0].status).toBe("confirmed");
    expect(approvalResults[0].amount).toBe(MAX_UINT256);
  });
});
