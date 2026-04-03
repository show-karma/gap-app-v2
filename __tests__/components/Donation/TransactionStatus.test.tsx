/**
 * Tests for TransactionStatus component
 *
 * Covers:
 * - Empty state: returns null when no transfers
 * - Success state: renders transfer items
 * - Error state: shows failure banner and retry button
 * - Retry button logic (canRetry + hasFailures + onRetry)
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionStatus } from "@/components/Donation/TransactionStatus";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock TransactionStatusItem
vi.mock("@/components/Donation/TransactionStatusItem", () => ({
  TransactionStatusItem: ({
    transfer,
    projectTitle,
  }: {
    transfer: { projectId: string; status: string };
    projectTitle?: string;
  }) => (
    <div data-testid={`status-item-${transfer.projectId}`}>
      {projectTitle || transfer.projectId} - {transfer.status}
    </div>
  ),
}));

const mockToken: SupportedToken = {
  address: "0xUSDC",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 10,
  chainName: "Optimism",
  isNative: false,
};

const mockItems = [
  { uid: "p1", title: "Project Alpha" },
  { uid: "p2", title: "Project Beta" },
];

const mockSelectedTokens = {
  p1: mockToken,
  p2: mockToken,
};

describe("TransactionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should return null when transfers array is empty", () => {
      const { container } = renderWithProviders(
        <TransactionStatus transfers={[]} items={mockItems} selectedTokens={mockSelectedTokens} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Success state", () => {
    it("should render Transaction Status heading", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "success", hash: "0xABC" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
        />
      );

      expect(screen.getByText("Transaction Status")).toBeInTheDocument();
    });

    it("should render a TransactionStatusItem for each transfer", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[
            { projectId: "p1", status: "success", hash: "0xABC" },
            { projectId: "p2", status: "pending" },
          ]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
        />
      );

      expect(screen.getByTestId("status-item-p1")).toBeInTheDocument();
      expect(screen.getByTestId("status-item-p2")).toBeInTheDocument();
    });

    it("should pass project title to TransactionStatusItem", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "success", hash: "0x1" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
        />
      );

      expect(screen.getByText("Project Alpha - success")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show failure banner when some transfers failed", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "error", error: "TX failed" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
        />
      );

      expect(
        screen.getByText("Some donations failed. Review the errors below and retry if needed.")
      ).toBeInTheDocument();
    });

    it("should not show failure banner when no failures", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "success", hash: "0x1" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
        />
      );

      expect(screen.queryByText(/Some donations failed/)).not.toBeInTheDocument();
    });
  });

  describe("Retry button", () => {
    it("should show Retry Failed button when there are failures and canRetry and onRetry", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "error", error: "TX failed" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
          onRetry={onRetry}
          canRetry={true}
        />
      );

      const retryButton = screen.getByText("Retry Failed");
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should not show retry button when canRetry is false", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "error", error: "TX failed" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
          onRetry={vi.fn()}
          canRetry={false}
        />
      );

      expect(screen.queryByText("Retry Failed")).not.toBeInTheDocument();
    });

    it("should not show retry button when onRetry is not provided", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "error", error: "TX failed" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
          canRetry={true}
        />
      );

      expect(screen.queryByText("Retry Failed")).not.toBeInTheDocument();
    });

    it("should not show retry button when there are no failures", () => {
      renderWithProviders(
        <TransactionStatus
          transfers={[{ projectId: "p1", status: "success", hash: "0x1" }]}
          items={mockItems}
          selectedTokens={mockSelectedTokens}
          onRetry={vi.fn()}
          canRetry={true}
        />
      );

      expect(screen.queryByText("Retry Failed")).not.toBeInTheDocument();
    });
  });
});
