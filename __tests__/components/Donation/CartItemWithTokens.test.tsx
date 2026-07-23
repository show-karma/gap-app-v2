/**
 * Tests for CartItemWithTokens component
 *
 * Covers:
 * - Token filtering by configured chain payout addresses
 * - Missing payout detection
 * - Payout info construction for selected token
 * - Selected token kept in options even if not in configured chains
 */

import { CartItemWithTokens } from "@/components/Donation/CartItemWithTokens";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock shortAddress
vi.mock("@/utilities/shortAddress", () => ({
  shortAddress: (addr?: string) => (addr ? `${addr.slice(0, 6)}...` : ""),
}));

// Mock CartItemRow to inspect the props passed to it
const mockCartItemRow = vi.fn(() => <div data-testid="cart-item-row" />);
vi.mock("@/components/Donation/CartItemRow", () => ({
  CartItemRow: (props: any) => mockCartItemRow(props),
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

const mockItem = {
  uid: "project-1",
  title: "Test Project",
};

const defaultProps = {
  item: mockItem,
  chainPayoutAddress: { "10": "0xPayoutAddress" },
  selectedToken: mockUSDC,
  currentAmount: "50",
  allAvailableTokens: [mockUSDC, mockETH],
  balanceByTokenKey: { "USDC-10": "1000", "ETH-8453": "2.5" },
  onTokenSelect: vi.fn(),
  onAmountChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("CartItemWithTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token filtering", () => {
    it("should filter tokens to only configured chains", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      // Only chain 10 is configured, so only USDC should be in tokenOptions
      expect(passedProps.tokenOptions).toEqual([mockUSDC]);
    });

    it("should include selected token even if not in configured chains", () => {
      renderWithProviders(
        <CartItemWithTokens
          {...defaultProps}
          selectedToken={mockETH}
          chainPayoutAddress={{ "10": "0xPayoutAddress" }}
        />
      );

      const passedProps = mockCartItemRow.mock.calls[0][0];
      // USDC is on chain 10 (configured), ETH on 8453 (not configured but selected)
      expect(passedProps.tokenOptions).toHaveLength(2);
      expect(passedProps.tokenOptions).toContainEqual(mockETH);
    });

    it("should allow all tokens for chains with payout addresses", () => {
      renderWithProviders(
        <CartItemWithTokens
          {...defaultProps}
          chainPayoutAddress={{ "10": "0xAddr1", "8453": "0xAddr2" }}
        />
      );

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.tokenOptions).toHaveLength(2);
    });
  });

  describe("Missing payout detection", () => {
    it("should set isMissingPayout to true when no chain payout addresses exist", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} chainPayoutAddress={undefined} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.isMissingPayout).toBe(true);
    });

    it("should set isMissingPayout to true when chainPayoutAddress is empty object", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} chainPayoutAddress={{}} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.isMissingPayout).toBe(true);
    });

    it("should set isMissingPayout to false when chain payout addresses exist", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.isMissingPayout).toBe(false);
    });
  });

  describe("Payout info construction", () => {
    it("should build payoutInfo from selected token chain", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.payoutInfo).toEqual({
        address: "0xPayoutAddress",
        isLoading: false,
        isMissing: false,
      });
    });

    it("should set isMissing to true when payout address is missing for selected chain", () => {
      renderWithProviders(
        <CartItemWithTokens
          {...defaultProps}
          selectedToken={mockETH}
          chainPayoutAddress={{ "10": "0xPayoutAddress" }}
        />
      );

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.payoutInfo?.isMissing).toBe(true);
    });

    it("should return undefined payoutInfo when no token is selected", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} selectedToken={undefined} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(passedProps.payoutInfo).toBeUndefined();
    });
  });

  describe("Props forwarding", () => {
    it("should pass formatAddress as shortAddress", () => {
      renderWithProviders(<CartItemWithTokens {...defaultProps} />);

      const passedProps = mockCartItemRow.mock.calls[0][0];
      expect(typeof passedProps.formatAddress).toBe("function");
      expect(passedProps.formatAddress("0x1234567890")).toBe("0x1234...");
    });
  });
});
