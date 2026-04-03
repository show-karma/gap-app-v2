/**
 * Tests for CartItemRow component
 *
 * Covers:
 * - Success state: renders project info, token selector, amount input, remove button
 * - Missing payout address warning
 * - Disabled amount input when no token selected
 * - User interactions: amount change, remove
 * - Accessibility labels
 */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartItemRow } from "@/components/Donation/CartItemRow";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock child components to isolate CartItemRow
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => <div data-testid={`avatar-${name}`}>{name}</div>,
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Donation/BalanceDisplay", () => ({
  BalanceDisplay: () => <div data-testid="balance-display" />,
}));

vi.mock("@/components/Donation/PayoutAddressDisplay", () => ({
  PayoutAddressDisplay: () => <div data-testid="payout-address-display" />,
}));

vi.mock("@/components/Donation/TokenSelector", () => ({
  TokenSelector: () => <div data-testid="token-selector-mock" />,
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      OVERVIEW: (slug: string) => `/project/${slug}`,
    },
  },
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

const mockItem = {
  uid: "project-1",
  slug: "test-project",
  title: "Test Project",
  imageURL: "https://example.com/image.png",
};

const defaultProps = {
  item: mockItem,
  selectedToken: mockToken,
  currentAmount: "50",
  tokenOptions: [mockToken],
  balanceByTokenKey: { "USDC-10": "1000" },
  onTokenSelect: vi.fn(),
  onAmountChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("CartItemRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success state", () => {
    it("should render project title in heading", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      const heading = screen.getByRole("heading", { name: "Test Project" });
      expect(heading).toBeInTheDocument();
    });

    it("should render profile picture", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.getByTestId("avatar-Test Project")).toBeInTheDocument();
    });

    it("should render amount input with current value", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      const input = screen.getByLabelText("Donation amount for Test Project in USDC");
      expect(input).toHaveValue(50);
    });

    it("should render the token symbol next to the amount input", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.getByText("USDC")).toBeInTheDocument();
    });

    it("should render the remove button", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.getByTestId("remove-item")).toBeInTheDocument();
    });

    it("should have correct data-testid", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.getByTestId("cart-item-project-1")).toBeInTheDocument();
    });
  });

  describe("Empty / no-token state", () => {
    it("should disable amount input when no token is selected", () => {
      renderWithProviders(<CartItemRow {...defaultProps} selectedToken={undefined} />);

      const input = screen.getByLabelText("Donation amount for Test Project");
      expect(input).toBeDisabled();
    });

    it("should not show token symbol when no token is selected", () => {
      renderWithProviders(<CartItemRow {...defaultProps} selectedToken={undefined} />);

      // The USDC symbol span should not be present
      const symbols = screen.queryAllByText("USDC");
      expect(symbols).toHaveLength(0);
    });
  });

  describe("Missing payout address", () => {
    it("should display missing payout warning when isMissingPayout is true", () => {
      renderWithProviders(<CartItemRow {...defaultProps} isMissingPayout={true} />);

      expect(screen.getByText("No payout address configured")).toBeInTheDocument();
    });

    it("should not display missing payout warning by default", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.queryByText("No payout address configured")).not.toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should call onAmountChange when amount is typed", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      const input = screen.getByLabelText("Donation amount for Test Project in USDC");
      // fireEvent required: controlled number input needs single-event value change
      fireEvent.change(input, { target: { value: "75" } });

      expect(defaultProps.onAmountChange).toHaveBeenCalledWith("75");
    });

    it("should call onRemove when remove button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<CartItemRow {...defaultProps} />);

      await user.click(screen.getByTestId("remove-item"));

      expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on the remove button", () => {
      renderWithProviders(<CartItemRow {...defaultProps} />);

      expect(screen.getByLabelText("Remove Test Project from donation cart")).toBeInTheDocument();
    });

    it("should use uid as fallback in project link when slug is missing", () => {
      renderWithProviders(
        <CartItemRow {...defaultProps} item={{ ...mockItem, slug: undefined }} />
      );

      const heading = screen.getByRole("heading", { name: "Test Project" });
      expect(heading.closest("a")).toHaveAttribute("href", "/project/project-1");
    });
  });
});
