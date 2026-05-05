/**
 * Tests for CompletedDonations component
 *
 * Covers:
 * - Empty state: no donations shows fallback
 * - Success state: successful donations with summary cards
 * - Mixed state: successful + failed donations
 * - Make Another Donation button
 * - Back to Community link
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompletedDonations } from "@/components/Donation/CompletedDonations";
import type { DonationSession } from "@/store/donationCart";
import { renderWithProviders } from "../../utils/render";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "test-community" }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/utilities/network", () => ({
  getExplorerUrl: (chainId: number, hash: string) => `https://explorer.test/${chainId}/tx/${hash}`,
}));

const mockToken = {
  address: "0xUSDC",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 10,
  chainName: "Optimism",
  isNative: false,
};

const successfulDonation = {
  projectId: "p1",
  projectTitle: "Project Alpha",
  projectImageURL: "https://example.com/alpha.png",
  amount: "100",
  token: mockToken,
  chainId: 10,
  transactionHash: "0xABC123",
  timestamp: Date.now(),
  status: "success" as const,
};

const failedDonation = {
  projectId: "p2",
  projectTitle: "Project Beta",
  projectImageURL: "https://example.com/beta.png",
  amount: "50",
  token: mockToken,
  chainId: 10,
  transactionHash: "",
  timestamp: Date.now(),
  status: "failed" as const,
};

const mockSession: DonationSession = {
  id: "session-1",
  timestamp: Date.now(),
  donations: [successfulDonation],
  totalProjects: 1,
};

describe("CompletedDonations", () => {
  const onStartNewDonation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show fallback when session has no donations", () => {
      const emptySession: DonationSession = {
        id: "session-empty",
        timestamp: Date.now(),
        donations: [],
        totalProjects: 0,
      };

      renderWithProviders(
        <CompletedDonations session={emptySession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("No donation data available")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Browse Projects" })).toBeInTheDocument();
    });

    it("should call onStartNewDonation when Browse Projects is clicked in empty state", async () => {
      const user = userEvent.setup();
      const emptySession: DonationSession = {
        id: "session-empty",
        timestamp: Date.now(),
        donations: [],
        totalProjects: 0,
      };

      renderWithProviders(
        <CompletedDonations session={emptySession} onStartNewDonation={onStartNewDonation} />
      );

      await user.click(screen.getByRole("button", { name: "Browse Projects" }));
      expect(onStartNewDonation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Success state", () => {
    it("should display the completion header", () => {
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("Donation Complete!")).toBeInTheDocument();
    });

    it("should use plural when multiple donations", () => {
      const multiSession: DonationSession = {
        ...mockSession,
        donations: [successfulDonation, { ...successfulDonation, projectId: "p3" }],
        totalProjects: 2,
      };

      renderWithProviders(
        <CompletedDonations session={multiSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("Donations Complete!")).toBeInTheDocument();
      expect(screen.getByText("Thank you for supporting 2 projects")).toBeInTheDocument();
    });

    it("should display summary cards", () => {
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Total Donated")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
    });

    it("should display donation transaction details", () => {
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("Donation Transactions")).toBeInTheDocument();
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      // "100 USDC" appears in both summary and detail; verify at least one exists
      expect(screen.getAllByText("100 USDC")).toHaveLength(2);
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("View TX")).toBeInTheDocument();
    });

    it("should show total amounts aggregated by token", () => {
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      // The token total appears in the summary card
      const matches = screen.getAllByText("100 USDC");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Mixed state (successes and failures)", () => {
    it("should show failed donations section", () => {
      const mixedSession: DonationSession = {
        ...mockSession,
        donations: [successfulDonation, failedDonation],
        totalProjects: 2,
      };

      renderWithProviders(
        <CompletedDonations session={mixedSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("Failed Transactions")).toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("should show failure count in status area", () => {
      const mixedSession: DonationSession = {
        ...mockSession,
        donations: [successfulDonation, failedDonation],
        totalProjects: 2,
      };

      renderWithProviders(
        <CompletedDonations session={mixedSession} onStartNewDonation={onStartNewDonation} />
      );

      expect(screen.getByText("(1 failed)")).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should call onStartNewDonation when Make Another Donation is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      await user.click(screen.getByRole("button", { name: /Make Another Donation/ }));
      expect(onStartNewDonation).toHaveBeenCalledTimes(1);
    });

    it("should render Back to Community link", () => {
      renderWithProviders(
        <CompletedDonations session={mockSession} onStartNewDonation={onStartNewDonation} />
      );

      const link = screen.getByText("Back to Community");
      expect(link.closest("a")).toHaveAttribute("href", "/community/test-community");
    });
  });
});
