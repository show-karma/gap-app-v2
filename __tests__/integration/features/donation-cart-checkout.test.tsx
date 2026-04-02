/**
 * Integration Tests for Donation Cart & Checkout UI
 *
 * Tests the interaction between the Zustand donation cart store
 * and the UI components (CartItemRow, ValidationErrors, EmptyCart,
 * TokenSelector, DonationStepsPreview) to verify realistic user flows.
 *
 * Coverage:
 * - Cart management (add, remove, toggle, clear, capacity limits)
 * - Token selection and amount configuration
 * - Payment synchronization (store -> UI)
 * - Validation errors (insufficient balance, missing payouts, invalid amounts)
 * - Steps preview generation for single-chain and multi-chain donations
 */

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartItemRow } from "@/components/Donation/CartItemRow";
import { EmptyCart } from "@/components/Donation/EmptyCart";
import { TokenSelector } from "@/components/Donation/TokenSelector";
import { ValidationErrors } from "@/components/Donation/ValidationErrors";
import { DonationStepsPreview } from "@/components/DonationStepsPreview";
import { DONATION_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useDonationCart } from "@/store/donationCart";
import { createMockNativeToken, createMockPayment, createMockToken } from "../test-utils";

// ── Factories ───────────────────────────────────────────────────────────────

function createCartItem(
  overrides: Partial<{ uid: string; title: string; slug: string; imageURL: string }> = {}
) {
  return {
    uid: overrides.uid ?? "project-1",
    title: overrides.title ?? "Test Project",
    slug: overrides.slug ?? "test-project",
    imageURL: overrides.imageURL ?? "https://example.com/logo.png",
  };
}

function createBalanceMap(
  entries: Array<{ symbol: string; chainId: number; balance: string }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of entries) {
    map[`${e.symbol}-${e.chainId}`] = e.balance;
  }
  return map;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Integration: Donation Cart & Checkout UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset cart state before each test
    const { result } = renderHook(() => useDonationCart());
    act(() => {
      result.current.clear();
      result.current.clearLastCompletedSession();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 1. Cart management
  // ────────────────────────────────────────────────────────────────────────

  describe("Cart management (add / remove / toggle / clear)", () => {
    it("adds a project to the cart and reflects it in state", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem());
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].title).toBe("Test Project");
    });

    it("prevents adding the same project twice", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem();

      act(() => {
        result.current.add(item);
      });

      let addedAgain = false;
      act(() => {
        addedAgain = result.current.add(item);
      });

      expect(addedAgain).toBe(true); // returns true (already exists)
      expect(result.current.items).toHaveLength(1);
    });

    it("removes a project and cleans up amounts and tokens", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createMockToken();

      act(() => {
        result.current.add(createCartItem());
        result.current.setAmount("project-1", "50");
        result.current.setSelectedToken("project-1", token);
      });

      expect(result.current.amounts["project-1"]).toBe("50");

      act(() => {
        result.current.remove("project-1");
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.amounts["project-1"]).toBeUndefined();
      expect(result.current.selectedTokens["project-1"]).toBeUndefined();
    });

    it("toggles a project in/out of the cart", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem();

      // Toggle in
      act(() => {
        result.current.toggle(item);
      });
      expect(result.current.items).toHaveLength(1);

      // Toggle out
      act(() => {
        result.current.toggle(item);
      });
      expect(result.current.items).toHaveLength(0);
    });

    it("clears the entire cart", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "p1", title: "P1" }));
        result.current.add(createCartItem({ uid: "p2", title: "P2" }));
        result.current.setAmount("p1", "10");
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.items).toHaveLength(0);
      expect(Object.keys(result.current.amounts)).toHaveLength(0);
    });

    it("rejects adding beyond MAX_CART_SIZE", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
          result.current.add(createCartItem({ uid: `p-${i}`, title: `Project ${i}` }));
        }
      });

      expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);
      expect(result.current.isCartFull()).toBe(true);

      let added = true;
      act(() => {
        added = result.current.add(createCartItem({ uid: "overflow", title: "Overflow" }));
      });

      expect(added).toBe(false);
      expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 2. Token selection
  // ────────────────────────────────────────────────────────────────────────

  describe("Token selection via TokenSelector component", () => {
    it("renders token options with balances", () => {
      const tokens: SupportedToken[] = [
        createMockToken({ symbol: "USDC", chainId: 10 }),
        createMockToken({ symbol: "USDT", chainId: 10, address: "0xUSDT" }),
      ];

      const balances = createBalanceMap([
        { symbol: "USDC", chainId: 10, balance: "500.123456" },
        { symbol: "USDT", chainId: 10, balance: "200" },
      ]);

      const onSelect = vi.fn();

      render(
        <TokenSelector
          tokenOptions={tokens}
          balanceByTokenKey={balances}
          onTokenSelect={onSelect}
        />
      );

      const select = screen.getByTestId("token-selector");
      expect(select).toBeInTheDocument();

      // Should have placeholder + 2 tokens
      const options = select.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(options[1].textContent).toContain("USDC");
      expect(options[1].textContent).toContain("500.123456");
    });

    it("calls onTokenSelect with the correct token when changed", async () => {
      const user = userEvent.setup();
      const usdc = createMockToken({ symbol: "USDC", chainId: 10 });
      const tokens = [usdc];
      const onSelect = vi.fn();

      render(
        <TokenSelector tokenOptions={tokens} balanceByTokenKey={{}} onTokenSelect={onSelect} />
      );

      const select = screen.getByTestId("token-selector");
      await user.selectOptions(select, "USDC-10");

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(usdc);
    });

    it("displays network badge when a token is selected", () => {
      const usdc = createMockToken({ symbol: "USDC", chainId: 10, chainName: "Optimism" });

      render(
        <TokenSelector
          selectedToken={usdc}
          tokenOptions={[usdc]}
          balanceByTokenKey={{}}
          onTokenSelect={vi.fn()}
        />
      );

      expect(screen.getByText("Optimism")).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 3. Amount configuration via CartItemRow
  // ────────────────────────────────────────────────────────────────────────

  describe("Amount configuration via CartItemRow", () => {
    it("renders project info, token selector, amount input, and remove button", () => {
      const item = createCartItem();
      const token = createMockToken({ symbol: "USDC" });

      render(
        <CartItemRow
          item={item}
          selectedToken={token}
          currentAmount="25"
          tokenOptions={[token]}
          balanceByTokenKey={{}}
          onTokenSelect={vi.fn()}
          onAmountChange={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByTestId("token-selector")).toBeInTheDocument();

      const amountInput = screen.getByLabelText(/Donation amount for Test Project in USDC/);
      expect(amountInput).toHaveValue(25);
      expect(screen.getByTestId("remove-item")).toBeInTheDocument();
    });

    it("fires onAmountChange when amount is updated", async () => {
      const user = userEvent.setup();
      const onAmountChange = vi.fn();
      const token = createMockToken();

      render(
        <CartItemRow
          item={createCartItem()}
          selectedToken={token}
          currentAmount=""
          tokenOptions={[token]}
          balanceByTokenKey={{}}
          onTokenSelect={vi.fn()}
          onAmountChange={onAmountChange}
          onRemove={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Donation amount for Test Project in USDC/);
      // fireEvent required: controlled number input needs single-event value change
      fireEvent.change(input, { target: { value: "42.5" } });

      expect(onAmountChange).toHaveBeenCalledWith("42.5");
    });

    it("disables amount input when no token is selected", () => {
      render(
        <CartItemRow
          item={createCartItem()}
          currentAmount=""
          tokenOptions={[]}
          balanceByTokenKey={{}}
          onTokenSelect={vi.fn()}
          onAmountChange={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Donation amount for Test Project/);
      expect(input).toBeDisabled();
    });

    it("fires onRemove when trash icon is clicked", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(
        <CartItemRow
          item={createCartItem()}
          currentAmount=""
          tokenOptions={[]}
          balanceByTokenKey={{}}
          onTokenSelect={vi.fn()}
          onAmountChange={vi.fn()}
          onRemove={onRemove}
        />
      );

      await user.click(screen.getByTestId("remove-item"));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("shows missing payout address warning", () => {
      render(
        <CartItemRow
          item={createCartItem()}
          currentAmount=""
          tokenOptions={[]}
          balanceByTokenKey={{}}
          isMissingPayout={true}
          onTokenSelect={vi.fn()}
          onAmountChange={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("No payout address configured")).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 4. Payment synchronization (store amounts/tokens -> payments)
  // ────────────────────────────────────────────────────────────────────────

  describe("Payment synchronization", () => {
    it("auto-generates payments when amount and token are set", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createMockToken({ symbol: "USDC", chainId: 10 });

      act(() => {
        result.current.add(createCartItem());
        result.current.setSelectedToken("project-1", token);
        result.current.setAmount("project-1", "75");
      });

      expect(result.current.payments).toHaveLength(1);
      expect(result.current.payments[0]).toEqual({
        projectId: "project-1",
        amount: "75",
        token,
        chainId: 10,
      });
    });

    it("excludes payments with zero or empty amounts", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createMockToken();

      act(() => {
        result.current.add(createCartItem({ uid: "p1", title: "P1" }));
        result.current.add(createCartItem({ uid: "p2", title: "P2" }));
        result.current.setSelectedToken("p1", token);
        result.current.setSelectedToken("p2", token);
        result.current.setAmount("p1", "100");
        result.current.setAmount("p2", "0");
      });

      expect(result.current.payments).toHaveLength(1);
      expect(result.current.payments[0].projectId).toBe("p1");
    });

    it("removes payment when project is removed from cart", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createMockToken();

      act(() => {
        result.current.add(createCartItem());
        result.current.setSelectedToken("project-1", token);
        result.current.setAmount("project-1", "50");
      });

      expect(result.current.payments).toHaveLength(1);

      act(() => {
        result.current.remove("project-1");
      });

      expect(result.current.payments).toHaveLength(0);
    });

    it("getPaymentForProject returns the correct payment", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createMockToken();

      act(() => {
        result.current.add(createCartItem());
        result.current.setSelectedToken("project-1", token);
        result.current.setAmount("project-1", "25");
      });

      const payment = result.current.getPaymentForProject("project-1");
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe("25");
      expect(result.current.getPaymentForProject("nonexistent")).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5. Error handling — ValidationErrors component
  // ────────────────────────────────────────────────────────────────────────

  describe("Error handling — ValidationErrors", () => {
    it("renders nothing when there are no errors", () => {
      const { container } = render(
        <ValidationErrors validationErrors={[]} missingPayouts={[]} items={[]} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("displays insufficient balance error with actionable steps", () => {
      render(
        <ValidationErrors
          validationErrors={["Insufficient USDC balance. Required: 500, Available: 100"]}
          missingPayouts={[]}
          items={[]}
        />
      );

      expect(screen.getByText("Cannot process donation")).toBeInTheDocument();
      expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
      expect(screen.getByText(/Add more USDC to your wallet/)).toBeInTheDocument();
      expect(screen.getByText(/Reduce the donation amount/)).toBeInTheDocument();
      expect(screen.getByText(/Select a different token/)).toBeInTheDocument();
    });

    it("displays missing balance info error", () => {
      render(
        <ValidationErrors
          validationErrors={["No balance information available for USDC on Optimism"]}
          missingPayouts={[]}
          items={[]}
        />
      );

      expect(screen.getByText("Balance Unavailable")).toBeInTheDocument();
      expect(screen.getByText(/Refresh the page to retry fetching balances/)).toBeInTheDocument();
    });

    it("displays invalid amount error", () => {
      render(
        <ValidationErrors
          validationErrors={["Invalid amount for project"]}
          missingPayouts={[]}
          items={[]}
        />
      );

      expect(screen.getByText("Invalid Amount")).toBeInTheDocument();
      expect(screen.getByText(/Enter a valid positive number/)).toBeInTheDocument();
    });

    it("displays missing payout address error with project name", () => {
      const items = [createCartItem({ uid: "p1", title: "My Project" })];

      render(<ValidationErrors validationErrors={[]} missingPayouts={["p1"]} items={items} />);

      expect(screen.getByText(/My Project: Missing Payout Address/)).toBeInTheDocument();
      expect(screen.getByText(/Contact the project owner/)).toBeInTheDocument();
    });

    it("displays multiple errors simultaneously", () => {
      const items = [createCartItem({ uid: "p1", title: "Alpha" })];

      render(
        <ValidationErrors
          validationErrors={[
            "Insufficient USDC balance. Required: 500, Available: 100",
            "Invalid amount for project",
          ]}
          missingPayouts={["p1"]}
          items={items}
        />
      );

      expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
      expect(screen.getByText("Invalid Amount")).toBeInTheDocument();
      expect(screen.getByText(/Alpha: Missing Payout Address/)).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 6. EmptyCart component
  // ────────────────────────────────────────────────────────────────────────

  describe("EmptyCart component", () => {
    it("renders empty state with browse button", () => {
      const onBrowse = vi.fn();
      render(<EmptyCart onBrowseProjects={onBrowse} />);

      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
      expect(screen.getByText("Browse Projects")).toBeInTheDocument();
    });

    it("calls onBrowseProjects when button is clicked", async () => {
      const user = userEvent.setup();
      const onBrowse = vi.fn();
      render(<EmptyCart onBrowseProjects={onBrowse} />);

      await user.click(screen.getByText("Browse Projects"));
      expect(onBrowse).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 7. DonationStepsPreview — multi-chain step generation
  // ────────────────────────────────────────────────────────────────────────

  describe("DonationStepsPreview — step generation", () => {
    it("generates approval + donation steps for a single ERC-20 payment", () => {
      const token = createMockToken({ symbol: "USDC", chainId: 10, chainName: "Optimism" });
      const payments = [createMockPayment({ token, chainId: 10 })];

      render(<DonationStepsPreview payments={payments} onProceed={vi.fn()} onCancel={vi.fn()} />);

      // Approval step + donation step
      expect(screen.getByText("Token Approvals")).toBeInTheDocument();
      expect(screen.getByText("Execute Donations")).toBeInTheDocument();
      expect(screen.getByText(/Approve USDC/)).toBeInTheDocument();
      expect(screen.getByText(/Execute 1 donation/)).toBeInTheDocument();
    });

    it("skips approval step for native ETH payment", () => {
      const eth = createMockNativeToken(10);
      const payments = [createMockPayment({ token: eth, chainId: 10 })];

      render(<DonationStepsPreview payments={payments} onProceed={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.queryByText("Token Approvals")).not.toBeInTheDocument();
      expect(screen.getByText("Execute Donations")).toBeInTheDocument();
    });

    it("generates network switch steps for multi-chain donations", () => {
      const optimismToken = createMockToken({ chainId: 10, chainName: "Optimism" });
      const arbitrumToken = createMockToken({
        chainId: 42161,
        chainName: "Arbitrum One",
        address: "0xArbUSDC",
      });

      const payments = [
        createMockPayment({ projectId: "p1", token: optimismToken, chainId: 10 }),
        createMockPayment({ projectId: "p2", token: arbitrumToken, chainId: 42161 }),
      ];

      render(<DonationStepsPreview payments={payments} onProceed={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText("Switch Network")).toBeInTheDocument();
      // Should show 2 networks in summary
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("calls onProceed when Start Donations is clicked", async () => {
      const user = userEvent.setup();
      const onProceed = vi.fn();
      const payments = [createMockPayment()];

      render(<DonationStepsPreview payments={payments} onProceed={onProceed} onCancel={vi.fn()} />);

      await user.click(screen.getByText("Start Donations"));
      expect(onProceed).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when Review Changes is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const payments = [createMockPayment()];

      render(<DonationStepsPreview payments={payments} onProceed={vi.fn()} onCancel={onCancel} />);

      await user.click(screen.getByText("Review Changes"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("disables proceed button when isLoading", () => {
      const payments = [createMockPayment()];

      render(
        <DonationStepsPreview
          payments={payments}
          onProceed={vi.fn()}
          onCancel={vi.fn()}
          isLoading
        />
      );

      expect(screen.getByText("Processing...")).toBeDisabled();
    });

    it("uses correct singular/plural for network and transaction counts", () => {
      const payments = [createMockPayment()];

      render(<DonationStepsPreview payments={payments} onProceed={vi.fn()} onCancel={vi.fn()} />);

      // 1 network -> singular
      expect(screen.getByText("Network")).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 8. Full cart -> checkout end-to-end flow (store + components)
  // ────────────────────────────────────────────────────────────────────────

  describe("End-to-end: cart store + UI components", () => {
    it("builds correct payments from cart state and renders cart items", () => {
      const { result } = renderHook(() => useDonationCart());
      const usdc = createMockToken({ symbol: "USDC", chainId: 10, chainName: "Optimism" });
      const eth = createMockNativeToken(10);

      // Simulate user adding two projects with different tokens
      act(() => {
        result.current.add(createCartItem({ uid: "p1", title: "Alpha" }));
        result.current.add(createCartItem({ uid: "p2", title: "Beta" }));
        result.current.setSelectedToken("p1", usdc);
        result.current.setSelectedToken("p2", eth);
        result.current.setAmount("p1", "100");
        result.current.setAmount("p2", "0.5");
      });

      // Verify payments
      expect(result.current.payments).toHaveLength(2);

      // Render cart items using the store state
      const balances = createBalanceMap([
        { symbol: "USDC", chainId: 10, balance: "1000" },
        { symbol: "ETH", chainId: 10, balance: "5" },
      ]);

      const { unmount } = render(
        <>
          {result.current.items.map((item) => (
            <CartItemRow
              key={item.uid}
              item={item}
              selectedToken={result.current.selectedTokens[item.uid]}
              currentAmount={result.current.amounts[item.uid] || ""}
              tokenOptions={[usdc, eth]}
              balanceByTokenKey={balances}
              onTokenSelect={vi.fn()}
              onAmountChange={vi.fn()}
              onRemove={vi.fn()}
            />
          ))}
        </>
      );

      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();

      unmount();
    });

    it("renders steps preview from generated payments", () => {
      const { result } = renderHook(() => useDonationCart());
      const usdc = createMockToken({ symbol: "USDC", chainId: 10, chainName: "Optimism" });

      act(() => {
        result.current.add(createCartItem({ uid: "p1", title: "Alpha" }));
        result.current.add(createCartItem({ uid: "p2", title: "Beta" }));
        result.current.setSelectedToken("p1", usdc);
        result.current.setSelectedToken("p2", usdc);
        result.current.setAmount("p1", "100");
        result.current.setAmount("p2", "50");
      });

      render(
        <DonationStepsPreview
          payments={result.current.payments}
          onProceed={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 2 donations on same network = 1 approval step + 1 donation step
      expect(screen.getByText("Token Approvals")).toBeInTheDocument();
      expect(screen.getByText(/Execute 2 donations/)).toBeInTheDocument();
    });

    it("tracks completed donation session", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.setLastCompletedSession({
          id: "session-1",
          timestamp: Date.now(),
          donations: [],
          totalProjects: 2,
        });
      });

      expect(result.current.lastCompletedSession).toBeDefined();
      expect(result.current.lastCompletedSession?.totalProjects).toBe(2);

      act(() => {
        result.current.clearLastCompletedSession();
      });

      expect(result.current.lastCompletedSession).toBeNull();
    });
  });
});
