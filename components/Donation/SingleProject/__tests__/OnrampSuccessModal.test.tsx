import { fireEvent, render, screen } from "@testing-library/react";
import type { StripeOnrampSessionData } from "@/hooks/donation/types";
import { DonationStatus } from "@/hooks/donation/types";
import { OnrampSuccessModal } from "../OnrampSuccessModal";

// Mock useDonationPolling hook
jest.mock("@/hooks/donation/useDonationPolling", () => ({
  useDonationPolling: jest.fn(),
}));

// Mock getExplorerUrl and NETWORK_CHAIN_IDS
jest.mock("@/utilities/network", () => ({
  getExplorerUrl: jest.fn(
    (_chainId: number, txHash: string) => `https://basescan.org/tx/${txHash}`
  ),
  NETWORK_CHAIN_IDS: { base: 8453, ethereum: 1, polygon: 137 },
}));

import { useDonationPolling } from "@/hooks/donation/useDonationPolling";

const mockUseDonationPolling = useDonationPolling as jest.Mock;

/**
 * Helper to find the subtitle <p> element that contains the title and subtitle text.
 * The component renders: `{title} &mdash; {subtitle}` inside a single <p> tag.
 */
const getSubtitleParagraph = () => document.querySelector("p.text-sm.text-gray-500");

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
    donationUid: "donation-123" as string | null,
    chainId: 8453,
    onClose: jest.fn(),
  };

  const defaultPollingReturn = {
    donation: {
      uid: "donation-123",
      transactionHash: "0xabc123",
      amount: "99.50",
      tokenSymbol: "USDC",
      status: DonationStatus.PENDING,
    },
    isPolling: true,
    status: DonationStatus.PENDING,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDonationPolling.mockReturnValue(defaultPollingReturn);
  });

  describe("Progress Stepper", () => {
    it("renders all three step labels for delivering status", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: true,
        status: DonationStatus.PENDING,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Payment")).toBeInTheDocument();
      // "Delivering" appears both in the stepper and the status badge
      expect(screen.getAllByText("Delivering").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("renders all three step labels for completed status", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.COMPLETED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Payment")).toBeInTheDocument();
      expect(screen.getByText("Delivering")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("renders all three step labels for failed status", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.FAILED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Payment")).toBeInTheDocument();
      expect(screen.getByText("Delivering")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  describe("Hero Amount", () => {
    it("shows formatted fiat amount as hero text", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("does not show hero amount when source_amount is missing", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          source_amount: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.queryByText("$100.00")).not.toBeInTheDocument();
    });
  });

  describe("Title and Subtitle", () => {
    it("shows 'Payment Successful' when delivering", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: true,
        status: DonationStatus.PENDING,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Payment Successful");
      expect(subtitle!.textContent).toContain("Crypto is being delivered to the project");
    });

    it("shows 'Donation Complete' when completed via polling", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.COMPLETED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Donation Complete");
      expect(subtitle!.textContent).toContain("Your donation has been delivered");
    });

    it("shows 'Donation Failed' when failed", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.FAILED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Donation Failed");
      expect(subtitle!.textContent).toContain("Something went wrong delivering your donation");
    });
  });

  describe("Polling Indicator", () => {
    it("shows 'Checking status...' when isPolling is true", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: true,
        status: DonationStatus.PENDING,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Checking status...")).toBeInTheDocument();
    });

    it("hides 'Checking status...' when isPolling is false", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.COMPLETED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.queryByText("Checking status...")).not.toBeInTheDocument();
    });
  });

  describe("Explorer Link", () => {
    it("shows 'View' link with correct href when transaction hash exists", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const link = screen.getByRole("link", { name: /View/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", expect.stringContaining("0xabc123"));
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not show explorer link when no transaction hash available", () => {
      mockUseDonationPolling.mockReturnValue({
        donation: null,
        isPolling: true,
        status: null,
      });

      const sessionWithoutTx: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          transaction_id: undefined,
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionWithoutTx} />);

      expect(screen.queryByRole("link", { name: /View/i })).not.toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("shows 'Delivering' badge when status is pending", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: true,
        status: DonationStatus.PENDING,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      // "Delivering" appears both as stepper label and status badge
      const allDelivering = screen.getAllByText("Delivering");
      // At least 2: one in stepper, one in badge
      expect(allDelivering.length).toBe(2);
    });

    it("shows 'Completed' badge when status is completed", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.COMPLETED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("shows 'Failed' badge when status is failed", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.FAILED,
      });

      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onClose when 'Done & Close' button is clicked", () => {
      const onClose = jest.fn();
      render(<OnrampSuccessModal {...defaultProps} onClose={onClose} />);

      const doneButton = screen.getByRole("button", { name: /Done & Close/i });
      fireEvent.click(doneButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X (close) button is clicked", () => {
      const onClose = jest.fn();
      render(<OnrampSuccessModal {...defaultProps} onClose={onClose} />);

      // The X button has aria-label="Close" exactly, while the other button says "Done & Close"
      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has dialog role with aria-modal", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-labelledby pointing to the title", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute("aria-labelledby", "onramp-success-title");
    });

    it("has accessible close button with aria-label", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      // Use exact match to get the X close button (not "Done & Close")
      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label", "Close");
    });
  });

  describe("Missing Data Handling", () => {
    it("handles missing transaction_details without crashing", () => {
      const sessionData: StripeOnrampSessionData = {
        id: "session-123",
        status: "fulfillment_processing",
        transaction_details: undefined,
      };

      mockUseDonationPolling.mockReturnValue({
        donation: null,
        isPolling: true,
        status: null,
      });

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      // Should render without crashing, with "Payment Successful" in subtitle area
      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Payment Successful");
    });

    it("handles missing destination_amount gracefully", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          destination_amount: undefined,
        },
      };

      mockUseDonationPolling.mockReturnValue({
        donation: null,
        isPolling: true,
        status: null,
      });

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.queryByText("Crypto Amount")).not.toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("formats EUR currency correctly", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          source_currency: "eur",
        },
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      const amountText = screen.getByText(/100\.00/);
      expect(amountText.textContent).toMatch(/\u20AC100\.00/);
    });

    it("defaults to USD when source_currency is missing", () => {
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

    it("defaults to USDC when crypto currency is missing", () => {
      const sessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        transaction_details: {
          ...baseSessionData.transaction_details,
          destination_currency: undefined,
        },
      };

      mockUseDonationPolling.mockReturnValue({
        donation: null,
        isPolling: true,
        status: null,
      });

      render(<OnrampSuccessModal {...defaultProps} sessionData={sessionData} />);

      expect(screen.getByText(/USDC/)).toBeInTheDocument();
    });
  });

  describe("Resolved Status Fallback", () => {
    it("shows completed state when polling returns completed even if Stripe says processing", () => {
      mockUseDonationPolling.mockReturnValue({
        ...defaultPollingReturn,
        isPolling: false,
        status: DonationStatus.COMPLETED,
      });

      // sessionData still says fulfillment_processing
      render(<OnrampSuccessModal {...defaultProps} />);

      // Status badge should say "Completed"
      expect(screen.getByText("Completed")).toBeInTheDocument();
      // Title should say "Donation Complete"
      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Donation Complete");
    });

    it("resolves to completed when Stripe says fulfillment_complete and polling has not responded yet", () => {
      // polledStatus must be null (falsy) for the sessionData.status fallback to be reached
      mockUseDonationPolling.mockReturnValue({
        donation: null,
        isPolling: true,
        status: null,
      });

      const completedSessionData: StripeOnrampSessionData = {
        ...baseSessionData,
        status: "fulfillment_complete",
      };

      render(<OnrampSuccessModal {...defaultProps} sessionData={completedSessionData} />);

      // With polledStatus=null, the resolvedStatus logic falls through to check
      // sessionData.status === "fulfillment_complete", which returns "completed".
      expect(screen.getByText("Completed")).toBeInTheDocument();
      const subtitle = getSubtitleParagraph();
      expect(subtitle).not.toBeNull();
      expect(subtitle!.textContent).toContain("Donation Complete");
    });
  });

  describe("Crypto Amount Display", () => {
    it("displays crypto amount from polling donation data", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Crypto Amount")).toBeInTheDocument();
      expect(screen.getByText("99.5 USDC")).toBeInTheDocument();
    });

    it("shows network name", () => {
      render(<OnrampSuccessModal {...defaultProps} />);

      expect(screen.getByText("Network")).toBeInTheDocument();
      expect(screen.getByText("base")).toBeInTheDocument();
    });
  });
});
