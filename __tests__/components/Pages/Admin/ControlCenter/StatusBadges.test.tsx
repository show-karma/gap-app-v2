/**
 * Tests for PendingDisbursalBadge component.
 *
 * Focuses on behavioral filtering logic:
 * - Only invoices with milestoneStatus=VERIFIED AND paymentStatus="unpaid" count
 * - Badge renders null when count is 0
 * - Correct count and singular/plural text
 * - Tooltip shows milestone names (up to 5, then "+N more")
 * - Amber styling for the badge
 * - Accessible aria-label with correct singular/plural
 */

import { render, screen } from "@testing-library/react";
import { PendingDisbursalBadge } from "@/components/Pages/Admin/ControlCenter/StatusBadges";
import type { CommunityPayoutInvoiceInfo } from "@/src/features/payout-disbursement";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

/**
 * Mock Radix tooltip so tooltip content is always in the DOM.
 */
vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <span {...props}>{children}</span>
  ),
  Content: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => (
    <div data-testid="tooltip-content" {...props}>
      {children}
    </div>
  ),
}));

function makeInvoice(
  overrides: Partial<CommunityPayoutInvoiceInfo> = {}
): CommunityPayoutInvoiceInfo {
  return {
    milestoneLabel: "Milestone 1",
    milestoneUID: "uid-001",
    milestoneStatus: MilestoneLifecycleStatus.PENDING,
    milestoneDueDate: null,
    milestoneStatusUpdatedAt: null,
    invoiceStatus: "not_submitted",
    invoiceReceivedAt: null,
    invoiceReceivedBy: null,
    allocatedAmount: null,
    paymentStatus: "unpaid",
    paymentStatusDate: null,
    ...overrides,
  };
}

describe("PendingDisbursalBadge", () => {
  describe("renders null when no pending disbursals exist", () => {
    it("returns null for an empty invoices array", () => {
      const { container } = render(<PendingDisbursalBadge invoices={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when no invoices match verified+unpaid", () => {
      const invoices = [
        makeInvoice({
          milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "disbursed",
        }),
        makeInvoice({
          milestoneStatus: MilestoneLifecycleStatus.PENDING,
          paymentStatus: "unpaid",
        }),
      ];

      const { container } = render(<PendingDisbursalBadge invoices={invoices} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when milestoneStatus is null", () => {
      const invoices = [makeInvoice({ milestoneStatus: null, paymentStatus: "unpaid" })];
      const { container } = render(<PendingDisbursalBadge invoices={invoices} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("filtering logic — only counts VERIFIED + unpaid", () => {
    it("counts 1 when a single invoice is verified+unpaid", () => {
      const invoices = [
        makeInvoice({
          milestoneLabel: "Deliver Report",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);
      expect(screen.getByText(/1 pending disbursal/)).toBeInTheDocument();
    });

    it("counts only verified+unpaid, ignoring all other status combinations", () => {
      const invoices = [
        // Should count
        makeInvoice({
          milestoneLabel: "Good 1",
          milestoneUID: "uid-good-1",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
        // Should NOT count: various non-matching combinations
        makeInvoice({
          milestoneUID: "uid-disbursed",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "disbursed",
        }),
        makeInvoice({
          milestoneUID: "uid-pending",
          milestoneStatus: MilestoneLifecycleStatus.PENDING,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneUID: "uid-pending-payment",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "pending",
        }),
        makeInvoice({
          milestoneUID: "uid-awaiting",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "awaiting_signatures",
        }),
        makeInvoice({
          milestoneUID: "uid-completed",
          milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneUID: "uid-past-due",
          milestoneStatus: MilestoneLifecycleStatus.PAST_DUE,
          paymentStatus: "unpaid",
        }),
        // Should count
        makeInvoice({
          milestoneLabel: "Good 2",
          milestoneUID: "uid-good-2",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);
      expect(screen.getByText(/2 pending disbursal/)).toBeInTheDocument();
    });
  });

  describe("badge display", () => {
    it("renders amber badge styling on the button", () => {
      const invoices = [
        makeInvoice({
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);

      const badge = screen.getByText(/pending disbursal/).closest("button");
      expect(badge).toHaveClass("bg-amber-100");
      expect(badge).toHaveClass("text-amber-700");
    });

    it("provides accessible aria-label with singular form for 1 item", () => {
      const invoices = [
        makeInvoice({
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "1 pending disbursal milestone");
    });

    it("provides accessible aria-label with plural form for multiple items", () => {
      const invoices = [
        makeInvoice({
          milestoneUID: "uid-1",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneUID: "uid-2",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneUID: "uid-3",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "3 pending disbursal milestones");
    });
  });

  describe("tooltip content", () => {
    it("shows a summary and milestone names for pending items", () => {
      const invoices = [
        makeInvoice({
          milestoneLabel: "Deliver Final Report",
          milestoneUID: "uid-1",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
        makeInvoice({
          milestoneLabel: "Community Presentation",
          milestoneUID: "uid-2",
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        }),
      ];

      render(<PendingDisbursalBadge invoices={invoices} />);

      expect(screen.getByText("2 verified milestones awaiting disbursal")).toBeInTheDocument();
      expect(screen.getByText("Deliver Final Report")).toBeInTheDocument();
      expect(screen.getByText("Community Presentation")).toBeInTheDocument();
    });

    it("caps visible milestone names at 5 and shows '+N more' for overflow", () => {
      const invoices = Array.from({ length: 7 }, (_, i) =>
        makeInvoice({
          milestoneLabel: `Milestone ${i + 1}`,
          milestoneUID: `uid-${i}`,
          milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          paymentStatus: "unpaid",
        })
      );

      render(<PendingDisbursalBadge invoices={invoices} />);

      expect(screen.getByText(/7 pending disbursal/)).toBeInTheDocument();

      // First 5 visible
      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByText("Milestone 5")).toBeInTheDocument();

      // 6th and 7th hidden behind "+N more"
      expect(screen.queryByText("Milestone 6")).not.toBeInTheDocument();
      expect(screen.queryByText("Milestone 7")).not.toBeInTheDocument();

      const tooltipContainer = screen.getByTestId("tooltip-content");
      const normalizedText = tooltipContainer.textContent?.replace(/\s+/g, " ");
      expect(normalizedText).toContain("+2 more");
    });
  });
});
