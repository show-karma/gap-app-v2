import { render, screen } from "@testing-library/react";
import { PendingDisbursalBadge } from "@/components/Pages/Admin/ControlCenter/StatusBadges";
import type { CommunityPayoutInvoiceInfo } from "@/src/features/payout-disbursement";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

/**
 * Mock Radix tooltip primitives so that tooltip content is always rendered
 * in the DOM (Radix tooltips require pointer events that jsdom cannot simulate).
 */
jest.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

/**
 * Helper to build a CommunityPayoutInvoiceInfo object with sensible defaults.
 * Override any field via the partial parameter.
 */
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
  it("returns null when invoices array is empty", () => {
    const { container } = render(<PendingDisbursalBadge invoices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no invoices are verified-and-unpaid", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      // completed + unpaid -> does not match (not verified)
      makeInvoice({
        milestoneLabel: "M1",
        milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
        paymentStatus: "unpaid",
      }),
      // verified + disbursed -> does not match (not unpaid)
      makeInvoice({
        milestoneLabel: "M2",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "disbursed",
      }),
      // pending + unpaid -> does not match (not verified)
      makeInvoice({
        milestoneLabel: "M3",
        milestoneStatus: MilestoneLifecycleStatus.PENDING,
        paymentStatus: "unpaid",
      }),
    ];

    const { container } = render(<PendingDisbursalBadge invoices={invoices} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows badge with count 1 for a single pending disbursal", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      makeInvoice({
        milestoneLabel: "Deliver Report",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
    ];

    render(<PendingDisbursalBadge invoices={invoices} />);

    expect(screen.getByText(/1 pending disbursal/)).toBeInTheDocument();
  });

  it("shows badge with correct count for multiple pending disbursals", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      makeInvoice({
        milestoneLabel: "M1",
        milestoneUID: "uid-1",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
      makeInvoice({
        milestoneLabel: "M2",
        milestoneUID: "uid-2",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
      makeInvoice({
        milestoneLabel: "M3",
        milestoneUID: "uid-3",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
    ];

    render(<PendingDisbursalBadge invoices={invoices} />);

    expect(screen.getByText(/3 pending disbursal/)).toBeInTheDocument();
  });

  it("counts only verified+unpaid, ignoring verified+disbursed and pending+unpaid", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      // Should count: verified + unpaid
      makeInvoice({
        milestoneLabel: "Good 1",
        milestoneUID: "uid-good-1",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
      // Should NOT count: verified + disbursed
      makeInvoice({
        milestoneLabel: "Disbursed",
        milestoneUID: "uid-disbursed",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "disbursed",
      }),
      // Should NOT count: pending + unpaid
      makeInvoice({
        milestoneLabel: "Pending",
        milestoneUID: "uid-pending",
        milestoneStatus: MilestoneLifecycleStatus.PENDING,
        paymentStatus: "unpaid",
      }),
      // Should NOT count: verified + pending payment
      makeInvoice({
        milestoneLabel: "Pending Payment",
        milestoneUID: "uid-pending-payment",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "pending",
      }),
      // Should NOT count: verified + awaiting_signatures
      makeInvoice({
        milestoneLabel: "Awaiting Sigs",
        milestoneUID: "uid-awaiting",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "awaiting_signatures",
      }),
      // Should count: verified + unpaid
      makeInvoice({
        milestoneLabel: "Good 2",
        milestoneUID: "uid-good-2",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
      // Should NOT count: completed + unpaid
      makeInvoice({
        milestoneLabel: "Completed",
        milestoneUID: "uid-completed",
        milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
        paymentStatus: "unpaid",
      }),
      // Should NOT count: past_due + unpaid
      makeInvoice({
        milestoneLabel: "Past Due",
        milestoneUID: "uid-past-due",
        milestoneStatus: MilestoneLifecycleStatus.PAST_DUE,
        paymentStatus: "unpaid",
      }),
    ];

    render(<PendingDisbursalBadge invoices={invoices} />);

    // Only 2 invoices match: Good 1 and Good 2
    expect(screen.getByText(/2 pending disbursal/)).toBeInTheDocument();
  });

  it("renders the amber badge styling", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      makeInvoice({
        milestoneLabel: "M1",
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      }),
    ];

    render(<PendingDisbursalBadge invoices={invoices} />);

    const badge = screen.getByText(/pending disbursal/).closest("button");
    expect(badge).toHaveClass("bg-amber-100");
    expect(badge).toHaveClass("text-amber-700");
  });

  it("shows milestone names in tooltip content", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
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

    // With Radix mocked, tooltip content is always rendered
    expect(screen.getByText("2 verified milestones awaiting disbursal")).toBeInTheDocument();
    expect(screen.getByText("Deliver Final Report")).toBeInTheDocument();
    expect(screen.getByText("Community Presentation")).toBeInTheDocument();
  });

  it("shows '+N more' when there are more than 5 pending items", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = Array.from({ length: 7 }, (_, i) =>
      makeInvoice({
        milestoneLabel: `Milestone ${i + 1}`,
        milestoneUID: `uid-${i}`,
        milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
        paymentStatus: "unpaid",
      })
    );

    render(<PendingDisbursalBadge invoices={invoices} />);

    expect(screen.getByText(/7 pending disbursal/)).toBeInTheDocument();

    // Only first 5 milestone names should be rendered
    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByText("Milestone 5")).toBeInTheDocument();
    expect(screen.queryByText("Milestone 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Milestone 7")).not.toBeInTheDocument();

    // The "+N more" indicator uses a JSX expression that splits across text nodes,
    // so verify via the tooltip container's combined text content.
    const tooltipContainer = screen.getByTestId("tooltip-content");
    const normalizedText = tooltipContainer.textContent?.replace(/\s+/g, " ");
    expect(normalizedText).toContain("+2 more");
  });

  it("handles invoices with null milestoneStatus gracefully", () => {
    const invoices: CommunityPayoutInvoiceInfo[] = [
      makeInvoice({
        milestoneLabel: "Null status",
        milestoneStatus: null,
        paymentStatus: "unpaid",
      }),
    ];

    const { container } = render(<PendingDisbursalBadge invoices={invoices} />);
    // null milestoneStatus !== "verified", so badge should not render
    expect(container.firstChild).toBeNull();
  });
});
