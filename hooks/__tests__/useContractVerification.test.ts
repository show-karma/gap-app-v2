import { act, renderHook } from "@testing-library/react";
import { useAccount, useSignMessage } from "wagmi";
import { contractsService } from "@/services/contracts.service";
import { useContractVerification, VerificationStep } from "../useContractVerification";

// Mock dependencies
jest.mock("@/services/contracts.service", () => ({
  contractsService: {
    lookupDeployer: jest.fn(),
    requestVerificationMessage: jest.fn(),
    verifyContractSignature: jest.fn(),
  },
}));

jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useSignMessage: jest.fn(),
}));

const mockLookupDeployer = contractsService.lookupDeployer as jest.MockedFunction<
  typeof contractsService.lookupDeployer
>;
const mockRequestVerificationMessage =
  contractsService.requestVerificationMessage as jest.MockedFunction<
    typeof contractsService.requestVerificationMessage
  >;
const mockVerifyContractSignature = contractsService.verifyContractSignature as jest.MockedFunction<
  typeof contractsService.verifyContractSignature
>;
const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseSignMessage = useSignMessage as jest.MockedFunction<typeof useSignMessage>;

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

  let mockSignMessageAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSignMessageAsync = jest.fn();

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
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);
      mockVerifyContractSignature.mockResolvedValueOnce(mockVerificationResult);
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

      // Verify service calls
      expect(mockLookupDeployer).toHaveBeenCalledWith("ethereum", "0xContract123");
      expect(mockRequestVerificationMessage).toHaveBeenCalledWith(
        "ethereum",
        "0xContract123",
        "0xDeployer123"
      );
      expect(mockVerifyContractSignature).toHaveBeenCalledWith({
        network: "ethereum",
        contractAddress: "0xContract123",
        signature: "0xSignature123",
        nonce: "nonce123",
        projectUid: "project-uid-123",
      });
    });
  });

  describe("User Errors: Common mistakes users make", () => {
    it("should show clear error when user has wrong wallet connected", async () => {
      // User connected with 0xWrongWallet but contract was deployed by 0xDeployer123
      mockUseAccount.mockReturnValue({
        address: "0xWrongWallet",
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);

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
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);

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
    it("should show error when contract lookup fails", async () => {
      mockLookupDeployer.mockRejectedValueOnce(new Error("Contract not found"));

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xNonExistent", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBe("Contract not found");
    });
  });

  describe("Backend Errors: Service returns errors", () => {
    it("should handle verification message generation errors", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockRequestVerificationMessage.mockRejectedValueOnce(
        new Error("Failed to generate verification message")
      );

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBe("Failed to generate verification message");
    });

    it("should handle signature verification errors", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");
      mockVerifyContractSignature.mockRejectedValueOnce(new Error("Signature verification failed"));

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBe("Signature verification failed");
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
      mockRequestVerificationMessage.mockResolvedValueOnce({
        ...mockVerificationMessage,
        deployerAddress: "0xDEPLOYER123",
      });
      mockVerifyContractSignature.mockResolvedValueOnce(mockVerificationResult);
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
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);

      const { result } = renderHook(() => useContractVerification());

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
      mockRequestVerificationMessage.mockResolvedValueOnce(mockVerificationMessage);
      mockVerifyContractSignature.mockResolvedValueOnce(mockVerificationResult);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.SUCCESS);
    });
  });

  describe("Verification Steps", () => {
    it("should progress through all verification steps", async () => {
      const steps: VerificationStep[] = [];

      mockLookupDeployer.mockImplementation(async () => {
        steps.push(VerificationStep.LOOKING_UP_DEPLOYER);
        return mockDeployerInfo;
      });

      mockRequestVerificationMessage.mockImplementation(async () => {
        steps.push(VerificationStep.GENERATING_MESSAGE);
        return mockVerificationMessage;
      });

      mockSignMessageAsync.mockImplementation(async () => {
        steps.push(VerificationStep.WAITING_FOR_SIGNATURE);
        return "0xSignature123";
      });

      mockVerifyContractSignature.mockImplementation(async () => {
        steps.push(VerificationStep.VERIFYING_SIGNATURE);
        return mockVerificationResult;
      });

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.SUCCESS);
      expect(steps).toContain(VerificationStep.LOOKING_UP_DEPLOYER);
      expect(steps).toContain(VerificationStep.GENERATING_MESSAGE);
      expect(steps).toContain(VerificationStep.WAITING_FOR_SIGNATURE);
      expect(steps).toContain(VerificationStep.VERIFYING_SIGNATURE);
    });
  });
});
