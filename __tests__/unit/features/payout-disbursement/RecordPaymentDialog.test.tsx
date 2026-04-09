/**
 * @file Tests for RecordPaymentDialog component
 * @description Verifies payment type selection, form validation, and chain warning behavior.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutate = vi.fn();
const mockUseRecordPayment = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useRecordPayment: (...args: unknown[]) => mockUseRecordPayment(...args),
}));

vi.mock("@/config/tokens", () => ({
  TOKENS: { usdc: { decimals: 6 } },
  DEFAULT_USDC_CHAIN_ID: 1,
  TOKEN_ADDRESSES: {
    usdc: {
      1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    },
  },
}));

vi.mock("@/src/features/payout-disbursement/utils/format-token-amount", () => ({
  toSmallestUnit: vi.fn((amount: string) => `${Number(amount) * 1_000_000}`),
}));

import { RecordPaymentDialog } from "@/src/features/payout-disbursement/components/RecordPaymentDialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  grantUID: "grant-1",
  projectUID: "project-1",
  communityUID: "community-1",
  chainID: 1,
  milestoneAllocations: null,
  milestoneInvoices: [
    {
      milestoneLabel: "Milestone 1",
      milestoneUID: "ms-1",
      allocatedAmount: "25000",
      paymentStatus: "pending",
    },
    {
      milestoneLabel: "Milestone 2",
      milestoneUID: "ms-2",
      allocatedAmount: "50000",
      paymentStatus: "pending",
    },
  ],
  todayLocal: "2026-04-01",
  onSuccess: vi.fn(),
};

function renderDialog(overrides: Record<string, unknown> = {}) {
  return render(<RecordPaymentDialog {...defaultProps} {...overrides} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecordPaymentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRecordPayment.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("should render milestone options from invoices", () => {
    renderDialog();

    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByText("Milestone 2")).toBeInTheDocument();
  });

  it("should disable submit when no selection", () => {
    renderDialog();

    const submitButton = screen.getByRole("button", { name: /record payment/i });
    expect(submitButton).toBeDisabled();
  });

  it("should mark paid milestones as disabled", () => {
    renderDialog({
      milestoneInvoices: [
        {
          milestoneLabel: "Milestone 1",
          milestoneUID: "ms-1",
          allocatedAmount: "25000",
          paymentStatus: "disbursed",
        },
        {
          milestoneLabel: "Milestone 2",
          milestoneUID: "ms-2",
          allocatedAmount: "50000",
          paymentStatus: "pending",
        },
      ],
    });

    const paidCheckbox = screen
      .getByText("Milestone 1")
      .closest("label")!
      .querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(paidCheckbox).toBeDisabled();

    const pendingCheckbox = screen
      .getByText("Milestone 2")
      .closest("label")!
      .querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(pendingCheckbox).not.toBeDisabled();
  });

  it("should enable submit when amount, date, and milestone selected", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Select a milestone
    const milestoneCheckbox = screen
      .getByText("Milestone 1")
      .closest("label")!
      .querySelector("input[type='checkbox']") as HTMLInputElement;
    await user.click(milestoneCheckbox);

    // Fill amount
    const amountInput = screen.getByPlaceholderText("e.g. 50000");
    await user.clear(amountInput);
    await user.type(amountInput, "10000");

    // Fill date
    const dateInput = screen.getByLabelText("Payment Date");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-03-15");

    const submitButton = screen.getByRole("button", { name: /record payment/i });
    expect(submitButton).toBeEnabled();
  });

  it("should show chain warning when chain unsupported", () => {
    // chainID 999 is not in TOKEN_ADDRESSES.usdc
    renderDialog({ chainID: 999 });

    expect(screen.getByText(/USDC is not configured for this grant's chain/i)).toBeInTheDocument();
  });

  it("should not show chain warning when chain is supported", () => {
    renderDialog({ chainID: 1 });

    expect(
      screen.queryByText(/USDC is not configured for this grant's chain/i)
    ).not.toBeInTheDocument();
  });
});
