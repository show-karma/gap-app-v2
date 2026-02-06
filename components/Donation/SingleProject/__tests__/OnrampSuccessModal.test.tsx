import { fireEvent, render, screen } from "@testing-library/react";
import type { StripeOnrampSessionData } from "@/hooks/donation/types";
import { OnrampSuccessModal } from "../OnrampSuccessModal";

describe("OnrampSuccessModal", () => {
  const baseSessionData: StripeOnrampSessionData = {
    id: "session-123",
    status: "fulfillment_processing",
    transaction_details: {
      source_amount: "100.00",
      source_currency: "usd",
      destination_amount: "99.50",
      destination_currency: "usdc",
      destination_network: "base",
      transaction_id: "0x1234567890abcdef",
    },
  };

  const defaultProps = {
    sessionData: baseSessionData,
    network: "base",
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Display", () => {
    it("shows processing state correctly", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Payment Successful")).toBeInTheDocument();
      expect(screen.getByText("Processing Your Donation")).toBeInTheDocument();
      expect(screen.getByText(/Your payment was successful/)).toBeInTheDocument();
    });

    it("shows complete state correctly", () => {
      const completedSessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        status: "fulfillment_complete",
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={completedSessionData} />);

      expect(screen.getByText("Donation Complete")).toBeInTheDocument();
      expect(screen.getByText("Thank You!")).toBeInTheDocument();
      expect(screen.getByText(/Your donation has been successfully delivered/)).toBeInTheDocument();
    });

    it("displays formatted fiat amount", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Amount Paid")).toBeInTheDocument();
      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("displays crypto amount with decimals", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Crypto Amount")).toBeInTheDocument();
      expect(screen.getByText("99.500000 USDC")).toBeInTheDocument();
    });

    it("displays network name", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Network")).toBeInTheDocument();
      expect(screen.getByText("base")).toBeInTheDocument();
    });

    it("shows explorer link when transaction available", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const link = screen.getByRole("link", { name: /View Transaction/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", expect.stringContaining("0x1234567890abcdef"));
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not show explorer link when no transaction id", () => {
      const sessionWithoutTx: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          transaction_id: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionWithoutTx} />);

      expect(screen.queryByRole("link", { name: /View Transaction/i })).not.toBeInTheDocument();
    });

    it("shows status badge for processing", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Delivering")).toBeInTheDocument();
    });

    it("shows status badge for complete", () => {
      const completedSessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        status: "fulfillment_complete",
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={completedSessionData} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("Missing data handling", () => {
    it("handles missing source amount", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          source_amount: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.queryByText("Amount Paid")).not.toBeInTheDocument();
    });

    it("handles missing destination amount", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          destination_amount: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.queryByText("Crypto Amount")).not.toBeInTheDocument();
    });

    it("handles missing transaction_details", () => {
      const sessionData: StripeOnrampSessionData = {
        id: "session-123",
        status: "fulfillment_processing",
        transaction_details: undefined,
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      // Should still render without crashing
      expect(screen.getByText("Payment Successful")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "onramp-success-title");
    });

    it("has accessible close button in header", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const closeButtons = screen.getAllByRole("button");
      const headerCloseButton = closeButtons.find(
        (btn) => btn.getAttribute("aria-label") === "Close"
      );
      expect(headerCloseButton).toBeInTheDocument();
    });

    it("close button is keyboard accessible", () => {
      const onClose = jest.fn();
      render(<OnrampSuccessModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: /Close/i });
      closeButton.focus();
      fireEvent.keyDown(closeButton, { key: "Enter" });

      // The button should be focusable (native behavior)
      expect(document.activeElement).toBe(closeButton);
    });

    it("Done button calls onClose", () => {
      const onClose = jest.fn();
      render(<OnrampSuccessModal {...defaultProps} onClose={onClose} />);

      const doneButton = screen.getByRole("button", { name: /Done/i });
      fireEvent.click(doneButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Currency formatting", () => {
    it("handles EUR currency", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          source_currency: "eur",
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      // Should format as EUR
      const amountText = screen.getByText(/100\.00/);
      expect(amountText.textContent).toMatch(/€100\.00/);
    });

    it("defaults to USD when currency missing", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          source_currency: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("defaults to USDC when crypto currency missing", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          destination_currency: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.getByText(/USDC/)).toBeInTheDocument();
    });
  });

  describe("Network chain ID resolution", () => {
    it("uses destination_network for chain ID when available", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      // The explorer URL should be for Base (chainId 8453)
      const link = screen.getByRole("link", { name: /View Transaction/i });
      expect(link.getAttribute("href")).toContain("basescan.org");
    });

    it("falls back to network prop when destination_network missing", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          destination_network: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} network="polygon" />);

      // Should use polygon explorer
      const link = screen.getByRole("link", { name: /View Transaction/i });
      expect(link.getAttribute("href")).toContain("polygonscan.com");
    });
  });
});
