/**
 * Tests for TokenSelector component
 *
 * Covers:
 * - Empty state: no token selected shows placeholder
 * - Success state: selected token displayed with network badge
 * - Token options rendered in dropdown
 * - Token selection triggers callback
 * - Balance display in options
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TokenSelector } from "@/components/Donation/TokenSelector";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

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

const tokenOptions = [mockUSDC, mockETH];

const balanceByTokenKey: Record<string, string> = {
  "USDC-10": "1000.123456",
  "ETH-8453": "2.5",
};

describe("TokenSelector", () => {
  const onTokenSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should render placeholder when no token is selected", () => {
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      const select = screen.getByTestId("token-selector");
      expect(select).toHaveValue("");
    });

    it("should not show network badge when no token is selected", () => {
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      expect(screen.queryByText("Optimism")).not.toBeInTheDocument();
    });
  });

  describe("Success state", () => {
    it("should render the selected token value", () => {
      renderWithProviders(
        <TokenSelector
          selectedToken={mockUSDC}
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      const select = screen.getByTestId("token-selector");
      expect(select).toHaveValue("USDC-10");
    });

    it("should show network badge when a token is selected", () => {
      renderWithProviders(
        <TokenSelector
          selectedToken={mockUSDC}
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      expect(screen.getByText("Optimism")).toBeInTheDocument();
    });

    it("should render token options with balance in the dropdown", () => {
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      // Check options include balance info
      expect(screen.getByText("USDC on Optimism (Balance: 1000.123456)")).toBeInTheDocument();
      expect(screen.getByText("ETH on Base (Balance: 2.500000)")).toBeInTheDocument();
    });

    it("should show 0 balance when token has no balance entry", () => {
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={{}}
          onTokenSelect={onTokenSelect}
        />
      );

      expect(screen.getByText("USDC on Optimism (Balance: 0)")).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should call onTokenSelect when a token is chosen", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      const select = screen.getByTestId("token-selector");
      await user.selectOptions(select, "USDC-10");

      expect(onTokenSelect).toHaveBeenCalledWith(mockUSDC);
    });

    it("should not call onTokenSelect when the placeholder option is selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TokenSelector
          selectedToken={mockUSDC}
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      const select = screen.getByTestId("token-selector");
      await user.selectOptions(select, "");

      expect(onTokenSelect).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have a screen-reader label", () => {
      renderWithProviders(
        <TokenSelector
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />
      );

      expect(screen.getByLabelText("Select token for donation")).toBeInTheDocument();
    });
  });
});
