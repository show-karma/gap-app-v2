/**
 * Tests for DonationSummary component
 *
 * Covers:
 * - Empty state: no payments shows placeholder message
 * - Success state: payments are aggregated by token and displayed
 * - Multiple tokens and chains
 */

import { screen } from "@testing-library/react";
import { DonationSummary } from "@/components/Donation/DonationSummary";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock SUPPORTED_NETWORKS used in the component
vi.mock("@/constants/supportedTokens", () => ({
  SUPPORTED_NETWORKS: {
    10: {
      chainId: 10,
      chainName: "Optimism",
      blockExplorer: "https://optimistic.etherscan.io",
    },
    8453: {
      chainId: 8453,
      chainName: "Base",
      blockExplorer: "https://basescan.org",
    },
  },
}));

const mockUSDC: SupportedToken = {
  address: "0xUSDC",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 10,
  chainName: "Optimism",
  isNative: false,
};

const mockETH: SupportedToken = {
  address: "native",
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  chainId: 8453,
  chainName: "Base",
  isNative: true,
};

describe("DonationSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show placeholder when no payments exist", () => {
      renderWithProviders(<DonationSummary payments={[]} />);

      expect(screen.getByText("Donation Summary")).toBeInTheDocument();
      expect(
        screen.getByText("Select tokens and amounts to see your donation totals by network.")
      ).toBeInTheDocument();
    });
  });

  describe("Success state", () => {
    it("should display a single payment total", () => {
      renderWithProviders(
        <DonationSummary
          payments={[
            {
              projectId: "p1",
              amount: "50",
              token: mockUSDC,
              chainId: 10,
            },
          ]}
        />
      );

      expect(screen.getByText("USDC")).toBeInTheDocument();
      expect(screen.getByText("Optimism")).toBeInTheDocument();
      expect(screen.getByText("50.00")).toBeInTheDocument();
    });

    it("should aggregate multiple payments for the same token", () => {
      renderWithProviders(
        <DonationSummary
          payments={[
            { projectId: "p1", amount: "50", token: mockUSDC, chainId: 10 },
            { projectId: "p2", amount: "25.5", token: mockUSDC, chainId: 10 },
          ]}
        />
      );

      expect(screen.getByText("75.50")).toBeInTheDocument();
    });

    it("should display multiple tokens separately", () => {
      renderWithProviders(
        <DonationSummary
          payments={[
            { projectId: "p1", amount: "100", token: mockUSDC, chainId: 10 },
            { projectId: "p2", amount: "0.5", token: mockETH, chainId: 8453 },
          ]}
        />
      );

      expect(screen.getByText("USDC")).toBeInTheDocument();
      expect(screen.getByText("ETH")).toBeInTheDocument();
      expect(screen.getByText("Optimism")).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it("should handle empty amount strings by treating them as 0", () => {
      renderWithProviders(
        <DonationSummary
          payments={[{ projectId: "p1", amount: "", token: mockUSDC, chainId: 10 }]}
        />
      );

      expect(screen.getByText("0.00")).toBeInTheDocument();
    });
  });
});
