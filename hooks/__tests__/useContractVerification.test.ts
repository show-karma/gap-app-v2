import { act, renderHook, waitFor } from "@testing-library/react";
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

describe("useContractVerification", () => {
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

  describe("Initial State", () => {
    it("should initialize with idle state", () => {
      const { result } = renderHook(() => useContractVerification());

      expect(result.current.step).toBe(VerificationStep.IDLE);
      expect(result.current.deployerInfo).toBeNull();
      expect(result.current.verificationMessage).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.needsWalletSwitch).toBe(false);
    });
  });

  describe("Successful Verification Flow", () => {
    it("should complete full verification workflow", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null]) // verify-message
        .mockResolvedValueOnce([mockVerificationResult, null]); // verify-signature
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
      expect(result.current.result).toEqual(mockVerificationResult);
      expect(result.current.error).toBeNull();
      expect(verificationResult).toEqual(mockVerificationResult);
    });

    it("should transition through all verification steps", async () => {
      const steps: VerificationStep[] = [];

      mockLookupDeployer.mockImplementation(async () => {
        steps.push(VerificationStep.LOOKING_UP_DEPLOYER);
        return mockDeployerInfo;
      });

      mockFetchData.mockImplementation(async (url, method) => {
        if (url.includes("verify-message")) {
          steps.push(VerificationStep.GENERATING_MESSAGE);
          return [mockVerificationMessage, null];
        }
        if (url.includes("verify-signature")) {
          steps.push(VerificationStep.VERIFYING_SIGNATURE);
          return [mockVerificationResult, null];
        }
        return [null, null];
      });

      mockSignMessageAsync.mockImplementation(async () => {
        steps.push(VerificationStep.WAITING_FOR_SIGNATURE);
        return "0xSignature123";
      });

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(steps).toContain(VerificationStep.LOOKING_UP_DEPLOYER);
      expect(steps).toContain(VerificationStep.GENERATING_MESSAGE);
      expect(steps).toContain(VerificationStep.WAITING_FOR_SIGNATURE);
      expect(steps).toContain(VerificationStep.VERIFYING_SIGNATURE);
      expect(result.current.step).toBe(VerificationStep.SUCCESS);
    });

    it("should store deployer info and verification message", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.deployerInfo).toEqual(mockDeployerInfo);
      expect(result.current.verificationMessage).toEqual(mockVerificationMessage);
    });
  });

  describe("Deployer Lookup", () => {
    it("should fail if deployer lookup returns null", async () => {
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        const verificationResult = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
        expect(verificationResult).toBeNull();
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toContain("Could not find deployer");
      expect(result.current.error).toContain("0xContract123");
      expect(result.current.error).toContain("ethereum");
    });

    it("should set deployer info after successful lookup", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([null, "Simulated error"]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.deployerInfo).toEqual(mockDeployerInfo);
    });
  });

  describe("Wallet Check", () => {
    it("should detect wallet mismatch (case-insensitive)", async () => {
      mockUseAccount.mockReturnValue({
        address: "0xDifferentWallet",
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        const verificationResult = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
        expect(verificationResult).toBeNull();
      });

      expect(result.current.needsWalletSwitch).toBe(true);
      expect(result.current.error).toContain("switch to the deployer wallet");
      expect(result.current.error).toContain(mockVerificationMessage.deployerAddress);
    });

    it("should match wallets case-insensitively", async () => {
      mockUseAccount.mockReturnValue({
        address: "0xdeployer123", // lowercase
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([
          { ...mockVerificationMessage, deployerAddress: "0xDEPLOYER123" }, // uppercase
          null,
        ])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.needsWalletSwitch).toBe(false);
      expect(result.current.step).toBe(VerificationStep.SUCCESS);
    });

    it("should fail if no wallet connected", async () => {
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

  describe("Message Generation", () => {
    it("should handle message generation failure", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([null, "Failed to generate message"]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBe("Failed to generate message");
    });

    it("should handle no response from message endpoint", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([null, null]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Failed to generate verification message");
    });

    it("should call verify-message endpoint with correct parameters", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);
      mockFetchData.mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSig");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("verify-message"),
        "POST",
        {
          network: "ethereum",
          contractAddress: "0xContract123",
          userAddress: "0xDeployer123",
        }
      );
    });
  });

  describe("Signature Flow", () => {
    it("should handle user rejection (code 4001)", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);
      mockSignMessageAsync.mockRejectedValueOnce({
        code: 4001,
        message: "User rejected",
      });

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toContain("Signature request was cancelled");
      expect(result.current.error).toContain("try again when ready");
    });

    it("should handle user rejection (UserRejectedRequestError)", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);
      mockSignMessageAsync.mockRejectedValueOnce({
        name: "UserRejectedRequestError",
        message: "User rejected request",
      });

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Signature request was cancelled");
    });

    it("should handle generic signature error", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);
      mockSignMessageAsync.mockRejectedValueOnce(new Error("Network timeout"));

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Failed to sign message");
      expect(result.current.error).toContain("Network timeout");
    });

    it("should pass correct message to signMessageAsync", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(mockSignMessageAsync).toHaveBeenCalledWith({
        message: mockVerificationMessage.message,
      });
    });
  });

  describe("Signature Verification", () => {
    it("should handle expired nonce error", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([null, "Invalid or expired nonce"]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Verification request expired");
      expect(result.current.error).toContain("start the verification process again");
    });

    it("should handle nonce mismatch error", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([null, "Nonce mismatch"]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Verification mismatch error");
    });

    it("should handle signature verification failure", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([null, "Signature verification failed"]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toContain("Could not verify signature");
      expect(result.current.error).toContain("deployer wallet");
    });

    it("should handle verified=false in response", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([{ verified: false }, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
    });

    it("should call verify-signature endpoint with correct parameters", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("verify-signature"),
        "POST",
        {
          network: "ethereum",
          contractAddress: "0xContract123",
          signature: "0xSignature123",
          nonce: mockVerificationMessage.nonce,
          projectUid: "project-uid-123",
        }
      );
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all state to initial values", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([null, "Error"]);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe(VerificationStep.IDLE);
      expect(result.current.deployerInfo).toBeNull();
      expect(result.current.verificationMessage).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.needsWalletSwitch).toBe(false);
    });
  });

  describe("Error State Management", () => {
    it("should clear error when starting new verification", async () => {
      // First verification fails
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toBeTruthy();

      // Second verification starts
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([null, "New error"]);

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract456", "project-uid-456");
      });

      // Error should be the new error, not the old one
      expect(result.current.error).not.toContain("Could not find deployer");
    });
  });

  describe("Return Values", () => {
    it("should return VerificationResult on success", async () => {
      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData
        .mockResolvedValueOnce([mockVerificationMessage, null])
        .mockResolvedValueOnce([mockVerificationResult, null]);
      mockSignMessageAsync.mockResolvedValueOnce("0xSignature123");

      const { result } = renderHook(() => useContractVerification());

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
      });

      expect(returnValue).toEqual(mockVerificationResult);
    });

    it("should return null on error", async () => {
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
      });

      expect(returnValue).toBeNull();
    });

    it("should return null on wallet mismatch", async () => {
      mockUseAccount.mockReturnValue({
        address: "0xDifferentWallet",
      } as any);

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerInfo);
      mockFetchData.mockResolvedValueOnce([mockVerificationMessage, null]);

      const { result } = renderHook(() => useContractVerification());

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.verifyContract(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
      });

      expect(returnValue).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing error message property", async () => {
      mockLookupDeployer.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "0xContract123", "project-uid-123");
      });

      expect(result.current.error).toBe("An error occurred during verification");
    });

    it("should handle empty contract address", async () => {
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("ethereum", "", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
    });

    it("should handle empty network", async () => {
      mockLookupDeployer.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useContractVerification());

      await act(async () => {
        await result.current.verifyContract("", "0xContract123", "project-uid-123");
      });

      expect(result.current.step).toBe(VerificationStep.ERROR);
    });
  });
});
