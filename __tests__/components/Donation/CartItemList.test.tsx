/**
 * Tests for CartItemList component
 *
 * Covers:
 * - Empty state: no items renders header only
 * - Success state: renders CartItemWithTokens for each item
 * - Props forwarding to children
 */

import { screen } from "@testing-library/react";
import { CartItemList } from "@/components/Donation/CartItemList";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock CartItemWithTokens to isolate CartItemList
vi.mock("@/components/Donation/CartItemWithTokens", () => ({
  CartItemWithTokens: ({
    item,
    currentAmount,
  }: {
    item: { uid: string; title: string };
    currentAmount: string;
  }) => (
    <div data-testid={`cart-item-with-tokens-${item.uid}`}>
      {item.title} - {currentAmount}
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

const defaultProps = {
  items: [
    { uid: "p1", title: "Project Alpha", slug: "project-alpha" },
    { uid: "p2", title: "Project Beta" },
  ],
  selectedTokens: { p1: mockToken } as Record<string, SupportedToken>,
  amounts: { p1: "100", p2: "" } as Record<string, string>,
  chainPayoutAddresses: { p1: { "10": "0xABC" } } as Record<string, Record<string, string>>,
  allAvailableTokens: [mockToken],
  balanceByTokenKey: { "USDC-10": "500" },
  onTokenSelect: vi.fn(),
  onAmountChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("CartItemList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success state", () => {
    it("should render table header columns", () => {
      renderWithProviders(<CartItemList {...defaultProps} />);

      expect(screen.getByText("Project")).toBeInTheDocument();
      expect(screen.getByText("Payment Token")).toBeInTheDocument();
      expect(screen.getByText("Amount")).toBeInTheDocument();
    });

    it("should render one CartItemWithTokens per item", () => {
      renderWithProviders(<CartItemList {...defaultProps} />);

      expect(screen.getByTestId("cart-item-with-tokens-p1")).toBeInTheDocument();
      expect(screen.getByTestId("cart-item-with-tokens-p2")).toBeInTheDocument();
    });

    it("should pass current amount to each child", () => {
      renderWithProviders(<CartItemList {...defaultProps} />);

      expect(screen.getByText("Project Alpha - 100")).toBeInTheDocument();
      // Project Beta has empty amount, so rendered text is "Project Beta - "
      expect(screen.getByTestId("cart-item-with-tokens-p2")).toHaveTextContent("Project Beta -");
    });
  });

  describe("Empty state", () => {
    it("should render only the header when items array is empty", () => {
      renderWithProviders(<CartItemList {...defaultProps} items={[]} />);

      expect(screen.getByText("Project")).toBeInTheDocument();
      expect(screen.queryByTestId("cart-item-with-tokens-p1")).not.toBeInTheDocument();
    });
  });
});
