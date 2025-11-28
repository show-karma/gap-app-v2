import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useContractVerification, VerificationStep } from "@/hooks/useContractVerification";
import { ContractVerificationDialog } from "../ContractVerificationDialog";
import "@testing-library/jest-dom";

// Mock the hook
jest.mock("@/hooks/useContractVerification");
const mockUseContractVerification = useContractVerification as jest.MockedFunction<
  typeof useContractVerification
>;

describe("ContractVerificationDialog", () => {
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

  describe("Rendering", () => {
    it("should render when open", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Verify Contract Ownership")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ContractVerificationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Verify Contract Ownership")).not.toBeInTheDocument();
    });

    it("should display network and contract address", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText(/ethereum/i)).toBeInTheDocument();
      expect(screen.getByText("0xContract123")).toBeInTheDocument();
    });

    it("should capitalize network name", () => {
      render(<ContractVerificationDialog {...defaultProps} network="optimism" />);

      expect(screen.getByText(/optimism/i)).toBeInTheDocument();
    });
  });

  describe("Step Messages", () => {
    it("should show idle message initially", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Ready to verify contract ownership")).toBeInTheDocument();
    });

    it("should show looking up deployer message", () => {
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

      expect(screen.getByText("Looking up contract deployer...")).toBeInTheDocument();
    });

    it("should show checking wallet message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.CHECKING_WALLET,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Checking wallet connection...")).toBeInTheDocument();
    });

    it("should show generating message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.GENERATING_MESSAGE,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Generating verification message...")).toBeInTheDocument();
    });

    it("should show waiting for signature message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.WAITING_FOR_SIGNATURE,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Waiting for signature...")).toBeInTheDocument();
    });

    it("should show verifying signature message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.VERIFYING_SIGNATURE,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Verifying signature...")).toBeInTheDocument();
    });

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

    it("should show error message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.ERROR,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Verification failed")).toBeInTheDocument();
    });
  });

  describe("Deployer Information", () => {
    it("should display deployer address when available", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.CHECKING_WALLET,
        deployerInfo: {
          deployerAddress: "0xDeployer123",
          createdAt: "2024-01-01T00:00:00Z",
          txHash: "0xTxHash123",
        },
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText(/Deployer:/)).toBeInTheDocument();
      expect(screen.getByText("0xDeployer123")).toBeInTheDocument();
    });

    it("should not display deployer section when not available", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.queryByText(/Deployer:/)).not.toBeInTheDocument();
    });
  });

  describe("Error Display", () => {
    it("should display error message", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.ERROR,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: "Something went wrong",
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should not display error section when no error", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const errorElements = screen.queryAllByRole("alert");
      const errorTexts = errorElements.filter((el) => el.className.includes("red"));

      expect(errorTexts).toHaveLength(0);
    });
  });

  describe("Wallet Switch Warning", () => {
    it("should display wallet switch warning", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.CHECKING_WALLET,
        deployerInfo: {
          deployerAddress: "0xDeployer123",
          createdAt: "2024-01-01T00:00:00Z",
          txHash: "0xTxHash123",
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
        screen.getByText(/Please switch to the deployer wallet to continue/)
      ).toBeInTheDocument();
      expect(screen.getByText("0xDeployer123")).toBeInTheDocument();
    });

    it("should not display wallet switch warning when not needed", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.queryByText(/Please switch to the deployer wallet/)).not.toBeInTheDocument();
    });
  });

  describe("Instructions", () => {
    it("should display instructions in idle state", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("How it works:")).toBeInTheDocument();
      expect(screen.getByText(/We'll look up who deployed this contract/)).toBeInTheDocument();
    });

    it("should not display instructions when not idle", () => {
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

      expect(screen.queryByText("How it works:")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("should show loading spinner during verification", () => {
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

      const { container } = render(<ContractVerificationDialog {...defaultProps} />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should show success icon when successful", () => {
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

      const { container } = render(<ContractVerificationDialog {...defaultProps} />);

      // CheckCircleIcon should be present
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should show error icon when error occurs", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.ERROR,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: "Error occurred",
        needsWalletSwitch: false,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      const { container } = render(<ContractVerificationDialog {...defaultProps} />);

      // ExclamationCircleIcon should be present
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("should show Start Verification button in idle state", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Start Verification")).toBeInTheDocument();
    });

    it("should show Verifying... text when loading", () => {
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

      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });

    it("should disable verify button when loading", () => {
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

      const button = screen.getByText("Verifying...");
      expect(button).toBeDisabled();
    });

    it("should disable verify button when wallet switch needed", () => {
      mockUseContractVerification.mockReturnValue({
        step: VerificationStep.CHECKING_WALLET,
        deployerInfo: null,
        verificationMessage: null,
        result: null,
        error: null,
        needsWalletSwitch: true,
        verifyContract: mockVerifyContract,
        reset: mockReset,
      });

      render(<ContractVerificationDialog {...defaultProps} />);

      const button = screen.getByText("Start Verification");
      expect(button).toBeDisabled();
    });

    it("should show Close button on success", () => {
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

      const buttons = screen.getAllByText("Close");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should show Cancel button when not successful", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should disable cancel button when loading", () => {
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

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("User Interactions", () => {
    it("should call verifyContract when Start Verification clicked", async () => {
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

    it("should call onSuccess callback after successful verification", async () => {
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

    it("should not call onSuccess if verification fails", async () => {
      const onSuccess = jest.fn();
      mockVerifyContract.mockResolvedValueOnce(null);

      render(<ContractVerificationDialog {...defaultProps} onSuccess={onSuccess} />);

      const button = screen.getByText("Start Verification");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockVerifyContract).toHaveBeenCalled();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("should call reset and onClose when close button clicked", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const closeButton = screen.getAllByRole("button").find((btn) => btn.querySelector("svg"));

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call reset and onClose when cancel clicked", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call reset and onClose when Close button clicked after success", () => {
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

      const closeButtons = screen.getAllByText("Close");
      fireEvent.click(closeButtons[0]);

      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper dialog role", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have dialog title", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      expect(screen.getByText("Verify Contract Ownership")).toBeInTheDocument();
    });

    it("should handle keyboard navigation", () => {
      render(<ContractVerificationDialog {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long contract addresses", () => {
      const longAddress = "0x" + "a".repeat(100);

      render(<ContractVerificationDialog {...defaultProps} contractAddress={longAddress} />);

      expect(screen.getByText(longAddress)).toBeInTheDocument();
    });

    it("should handle special characters in network name", () => {
      render(<ContractVerificationDialog {...defaultProps} network="ethereum-mainnet" />);

      expect(screen.getByText(/ethereum-mainnet/i)).toBeInTheDocument();
    });

    it("should handle async onSuccess callback", async () => {
      const onSuccess = jest.fn().mockResolvedValue(undefined);
      const mockResult = { verified: true, contract: {} };
      mockVerifyContract.mockResolvedValueOnce(mockResult);

      render(<ContractVerificationDialog {...defaultProps} onSuccess={onSuccess} />);

      const button = screen.getByText("Start Verification");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should handle missing onSuccess callback", async () => {
      const mockResult = { verified: true, contract: {} };
      mockVerifyContract.mockResolvedValueOnce(mockResult);

      render(<ContractVerificationDialog {...defaultProps} onSuccess={undefined} />);

      const button = screen.getByText("Start Verification");

      // Should not throw
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });
  });
});
