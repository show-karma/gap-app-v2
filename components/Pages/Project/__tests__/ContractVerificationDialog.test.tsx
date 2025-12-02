import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useContractVerification, VerificationStep } from "@/hooks/useContractVerification";
import { ContractVerificationDialog } from "../ContractVerificationDialog";
import "@testing-library/jest-dom";

// Mock the hook
jest.mock("@/hooks/useContractVerification");
const mockUseContractVerification = useContractVerification as jest.MockedFunction<
  typeof useContractVerification
>;

describe("ContractVerificationDialog - User Experience", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    network: "ethereum",
    contractAddress: "0xContract123",
    projectUid: "project-uid-123",
  };

  const mockVerifyContract = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseContractVerification.mockReturnValue({
      step: VerificationStep.IDLE,
      deployerInfo: null,
      verificationMessage: null,
      result: null,
      error: null,
      needsWalletSwitch: false,
      verifyContract: mockVerifyContract,
      reset: mockReset,
    });
  });

  describe("User opens verification dialog", () => {
    it("should show dialog title and contract info", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Verify Contract Ownership")).toBeInTheDocument();
      expect(screen.getByText("0xContract123")).toBeInTheDocument();
      expect(screen.getByText(/ethereum/i)).toBeInTheDocument();
    });

    it("should show instructions on how verification works", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText(/How it works:/)).toBeInTheDocument();
      expect(screen.getByText(/look up who deployed this contract/)).toBeInTheDocument();
    });

    it("should show Start Verification button", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Start Verification")).toBeInTheDocument();
    });
  });

  describe("User clicks Start Verification", () => {
    it("should call verifyContract with correct parameters", async () => {
      mockVerifyContract.mockResolvedValueOnce(null);

      render(<ContractVerificationDialog {...defaultProps} />);

      const button = screen.getByText("Start Verification");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockVerifyContract).toHaveBeenCalledWith(
          "ethereum",
          "0xContract123",
          "project-uid-123"
        );
      });
    });

    it("should show progress during verification", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.LOOKING_UP_DEPLOYER,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });
  });

  describe("User sees error: wrong wallet connected", () => {
    it("should show wallet switch warning", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.CHECKING_WALLET,
        deployerInfo: {
          deployerAddress: "0xDeployer123",
          createdAt: "2024-01-01",
          txHash: "0xTx123",
        },
        verificationMessage: null,
        result: null,
        error: "Please switch to the deployer wallet",
        needsWalletSwitch: true,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(
        screen.getByText(/Log in with contract deployer wallet to proceed/)
      ).toBeInTheDocument();
      // Check for masked address format (appears in deployer info and warning)
      const maskedAddresses = screen.getAllByText("0xDepl...r123");
      expect(maskedAddresses.length).toBeGreaterThan(0);
      // Check for auto-continue message
      expect(
        screen.getByText(/Verification will continue automatically once you switch wallets/)
      ).toBeInTheDocument();
    });

    it("should disable verify button when wallet switch needed", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.IDLE, // Use IDLE so button shows "Start Verification"
        deployerInfo: { deployerAddress: "0xDeployer123", createdAt: "", txHash: "" },
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: true,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      const verifyButton = screen.getByText("Start Verification");
      expect(verifyButton).toBeDisabled();
    });
  });

  describe("User sees error message", () => {
    it("should display error when verification fails", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.ERROR,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: "Contract not found on blockchain",
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Contract not found on blockchain")).toBeInTheDocument();
    });
  });

  describe("User successfully verifies contract", () => {
    it("should show success message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.SUCCESS,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Contract verified successfully!")).toBeInTheDocument();
    });

    it("should call onSuccess callback", async () => {
      const onSuccess = jest.fn();
      const mockResult = { verified: true, contract: {} };
      mockVerifyContract.mockResolvedValueOnce(mockResult);

      render(<ContractVerificationDialog {...defaultProps} onSuccess={onSuccess} />);

      const button = screen.getByText("Start Verification");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should show Close button instead of verify buttons", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.SUCCESS,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.queryByText("Start Verification")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
      const closeButtons = screen.getAllByText("Close");
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe("User closes the dialog", () => {
    it("should reset state and call onClose when user clicks close icon", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const closeButtons = screen.getAllByRole("button");
      const closeIcon = closeButtons.find((btn) => btn.querySelector("svg"));

      if (closeIcon) {
        fireEvent.click(closeIcon);
      }

      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should reset state and call onClose when user clicks Cancel", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Dialog visibility", () => {
    it("should not render when closed", () => {
      render(<ContractVerificationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Verify Contract Ownership")).not.toBeInTheDocument();
    });
  });
});
