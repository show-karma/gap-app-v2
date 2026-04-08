/**
 * Expanded tests for utilities/erc20.ts
 *
 * Supplements the existing erc20.test.ts with additional edge cases:
 * - checkTokenAllowance: various bigint return values
 * - checkTokenAllowances: fallback chainId logic (publicClient.chain.id, default 0)
 * - executeApprovals: empty approvals array, progress callback mutability
 * - getApprovalAmount: edge cases with 0n and MAX_UINT256
 * - ERC20_ABI: structure validation
 */

import type { Address, PublicClient, WalletClient } from "viem";
import {
  checkTokenAllowance,
  checkTokenAllowances,
  ERC20_ABI,
  executeApprovals,
  getApprovalAmount,
  MAX_UINT256,
} from "@/utilities/erc20";

describe("erc20 utilities - expanded", () => {
  const mockToken = "0x1234567890123456789012345678901234567890" as Address;
  const mockOwner = "0x1111111111111111111111111111111111111111" as Address;
  const mockSpender = "0x2222222222222222222222222222222222222222" as Address;
  const mockAccount = "0x3333333333333333333333333333333333333333" as Address;

  const mockPublicClient = {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    chain: { id: 10 },
  } as unknown as PublicClient;

  const mockWalletClient = {
    writeContract: vi.fn(),
    account: { address: mockAccount },
    chain: { id: 10 },
  } as unknown as WalletClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // ERC20_ABI structure
  // =========================================================================

  describe("ERC20_ABI", () => {
    it("should expose allowance, approve, balanceOf, and decimals functions", () => {
      const functionNames = ERC20_ABI.map((item) => item.name);
      expect(functionNames).toContain("allowance");
      expect(functionNames).toContain("approve");
      expect(functionNames).toContain("balanceOf");
      expect(functionNames).toContain("decimals");
    });

    it("should have correct input/output signatures for allowance", () => {
      const allowanceFn = ERC20_ABI.find((item) => item.name === "allowance");
      expect(allowanceFn?.inputs).toHaveLength(2);
      expect(allowanceFn?.inputs[0].name).toBe("owner");
      expect(allowanceFn?.inputs[1].name).toBe("spender");
      expect(allowanceFn?.outputs[0].type).toBe("uint256");
    });
  });

  // =========================================================================
  // checkTokenAllowance - edge cases
  // =========================================================================

  describe("checkTokenAllowance - edge cases", () => {
    it("should handle zero allowance", async () => {
      mockPublicClient.readContract = vi.fn().mockResolvedValue(0n);
      const result = await checkTokenAllowance(mockPublicClient, mockToken, mockOwner, mockSpender);
      expect(result).toBe(0n);
    });

    it("should handle MAX_UINT256 allowance (unlimited approval)", async () => {
      mockPublicClient.readContract = vi.fn().mockResolvedValue(MAX_UINT256);
      const result = await checkTokenAllowance(mockPublicClient, mockToken, mockOwner, mockSpender);
      expect(result).toBe(MAX_UINT256);
    });

    it("should handle very small allowance", async () => {
      mockPublicClient.readContract = vi.fn().mockResolvedValue(1n);
      const result = await checkTokenAllowance(mockPublicClient, mockToken, mockOwner, mockSpender);
      expect(result).toBe(1n);
    });
  });

  // =========================================================================
  // checkTokenAllowances - chainId fallback
  // =========================================================================

  describe("checkTokenAllowances - chainId fallback", () => {
    it("should use publicClient.chain.id when no explicit chainId is provided", async () => {
      mockPublicClient.readContract = vi.fn().mockResolvedValue(0n);

      const results = await checkTokenAllowances(
        mockPublicClient,
        mockOwner,
        mockSpender,
        [{ tokenAddress: mockToken, tokenSymbol: "USDC", requiredAmount: 100n }]
        // no chainId parameter
      );

      expect(results[0].chainId).toBe(10); // from mockPublicClient.chain.id
    });

    it("should fall back to 0 when publicClient has no chain", async () => {
      const clientNoChain = {
        readContract: vi.fn().mockResolvedValue(0n),
      } as unknown as PublicClient;

      const results = await checkTokenAllowances(clientNoChain, mockOwner, mockSpender, [
        { tokenAddress: mockToken, tokenSymbol: "USDC", requiredAmount: 100n },
      ]);

      expect(results[0].chainId).toBe(0);
    });
  });

  // =========================================================================
  // executeApprovals - edge cases
  // =========================================================================

  describe("executeApprovals - edge cases", () => {
    it("should return empty array for empty approvals list", async () => {
      const results = await executeApprovals(
        mockWalletClient,
        mockPublicClient,
        mockAccount,
        mockSpender,
        []
      );
      expect(results).toEqual([]);
    });

    it("should report progress for each approval step", async () => {
      const capturedStatuses: string[] = [];
      const onProgress = vi.fn().mockImplementation((results: any[]) => {
        // Capture the status at call time since the array is mutated in-place
        capturedStatuses.push(results[results.length - 1].status);
      });
      const hash = "0xhash1";

      mockWalletClient.writeContract = vi.fn().mockResolvedValue(hash);
      mockPublicClient.waitForTransactionReceipt = vi.fn().mockResolvedValue({ status: "success" });

      await executeApprovals(
        mockWalletClient,
        mockPublicClient,
        mockAccount,
        mockSpender,
        [{ tokenAddress: mockToken, tokenSymbol: "USDC", amount: 100n }],
        onProgress
      );

      // Two calls: first with "pending", then with "confirmed"
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(capturedStatuses[0]).toBe("pending");
      expect(capturedStatuses[1]).toBe("confirmed");
    });
  });

  // =========================================================================
  // getApprovalAmount - additional edge cases
  // =========================================================================

  describe("getApprovalAmount - additional edge cases", () => {
    it("should return MAX_UINT256 for any amount when useExactAmount is false", () => {
      expect(getApprovalAmount(1n, false)).toBe(MAX_UINT256);
      expect(getApprovalAmount(0n, false)).toBe(MAX_UINT256);
      expect(getApprovalAmount(MAX_UINT256, false)).toBe(MAX_UINT256);
    });

    it("should return exact amount for any amount when useExactAmount is true", () => {
      expect(getApprovalAmount(1n, true)).toBe(1n);
      expect(getApprovalAmount(0n, true)).toBe(0n);
      expect(getApprovalAmount(MAX_UINT256, true)).toBe(MAX_UINT256);
    });
  });

  // =========================================================================
  // MAX_UINT256
  // =========================================================================

  describe("MAX_UINT256", () => {
    it("should be exactly 2^256 - 1", () => {
      expect(MAX_UINT256).toBe(2n ** 256n - 1n);
    });

    it("should be positive", () => {
      expect(MAX_UINT256 > 0n).toBe(true);
    });
  });
});
