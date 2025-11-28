import { act, renderHook } from "@testing-library/react";
import { useAccount, useSignMessage } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { useContractVerification, VerificationStep } from "../useContractVerification";
import { useDeployerLookup } from "../useDeployerLookup";

// Mock dependencies
jest.mock("../useDeployerLookup");
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useSignMessage: jest.fn(),
}));
jest.mock("@/utilities/fetchData");

const mockUseDeployerLookup = useDeployerLookup as jest.MockedFunction<typeof useDeployerLookup>;
const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseSignMessage = useSignMessage as jest.MockedFunction<typeof useSignMessage>;
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("useContractVerification - User Journeys", () => {
  const mockDeployerInfo = {
    deployerAddress: "0xDeployer123",
    createdAt: "2024-01-01T00:00:00Z",
    txHash: "0xTxHash123",
  };

  const mockVerificationMessage = {
    message: "Sign this message to verify contract ownership",
    nonce: "nonce123",
    expiresAt: "2024-01-01T01:00:00Z",
    deployerAddress: "0xDeployer123",
  };

  const mockVerificationResult = {
    verified: true,
    contract: {
      network: "ethereum",
      address: "0xContract123",
      verifiedAt: "2024-01-01T00:30:00Z",
      verifiedBy: "0xDeployer123",
    },
  };

  let mockLookupDeployer: jest.Mock;
  let mockSignMessageAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLookupDeployer = jest.fn();
    mockSignMessageAsync = jest.fn();

    mockUseDeployerLookup.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      lookupDeployer: mockLookupDeployer,
    });

    mockUseAccount.mockReturnValue({
      address: "0xDeployer123",
    } as any);

    mockUseSignMessage.mockReturnValue({
      signMessageAsync: mockSignMessageAsync,
    } as any);
  });

  describe("Happy Path: User successfully verifies their contract", () => {
    it("should complete verification when user owns the deployer wallet", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      let verificationResult: any;

      await act(async () => {
        verificationResult = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
      });

      expect(result.current.step).toBe(VerificationStep.SUCCESS);
      expect(verificationResult).toEqual(mockVerificationResult);
      expect(result.current.error).toBeNull();
    });
  });

  describe("User Errors: Common mistakes users make", () => {
    it("should show clear error when user has wrong wallet connected", async () => {
      // User connected with 0xWrongWallet but contract was deployed by 0xDeployer123
      mockUseAccount.mockReturnValue({
        address: "0xWrongWallet",
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.needsWalletSwitch).toBe(true);
      expect(result.current.error).toContain("switch to the deployer wallet");
      expect(result.current.error).toContain(mockVerificationMessage.deployerAddress);
    });

    it("should handle when user rejects signature in wallet (clicks cancel)", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);

      // User clicks "Reject" in MetaMask/wallet
      mockSignMessageAsync.mockRejectedValueOnce({
        code: 4001,
        message: "User rejected",
      });

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toContain("cancelled");
      expect(result.current.error).toContain("try again");
    });

    it("should handle when user takes too long to sign (nonce expired)", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([null, "Invalid or expired nonce"]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("expired");
      expect(result.current.error).toContain("start the verification process again");
    });

    it("should handle when user has no wallet connected", async () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBe("Please connect your wallet");
    });
  });

  describe("Contract Issues: Problems with the contract itself", () => {
    it("should show clear error when contract not found on blockchain", async () => {
      // Contract doesn't exist or wrong network
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xNonExistent", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toContain("Could not find deployer");
      expect(result.current.error).toContain("0xNonExistent");
    });
  });

  describe("Case Sensitivity: Wallet address matching should work regardless of case", () => {
    it("should match wallet addresses case-insensitively", async () => {
      // User wallet is lowercase
      mockUseAccount.mockReturnValue({
        address: "0xdeployer123",
      } as any);

      // Backend returns uppercase
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([
          { ...mockVerificationMessage, deployerAddress: "0xDEPLOYER123" },
          null,
        ])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      // Should NOT show wallet switch error
      expect(result.current.needsWalletSwitch).toBe(false);
      expect(result.current.step).toBe(VerificationStep.SUCCESS);
    });
  });

  describe("Recovery: User can retry after errors", () => {
    it("should allow user to retry after fixing wallet mismatch", async () => {
      // First attempt: wrong wallet
      mockUseAccount.mockReturnValue({
        address: "0xWrongWallet",
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);

      const { result, rerender } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.needsWalletSwitch).toBe(true);

      // User switches to correct wallet
      mockUseAccount.mockReturnValue({
        address: "0xDeployer123",
      } as any);

      // Reset and try again
      act(() => {
        result.current.reset();
      });

      // Second attempt: correct wallet
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.SUCCESS);
    });
  });
});
