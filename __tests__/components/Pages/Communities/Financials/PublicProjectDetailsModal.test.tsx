import { render, screen } from "@testing-library/react";
import {
  PublicProjectDetailsModal,
  type PublicProjectDetailsModalGrant,
} from "@/components/Pages/Communities/Financials/PublicProjectDetailsModal";
import type {
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
} from "@/src/features/payout-disbursement";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

// ─── Mock Radix dialog: always render content ─────────────────────────────────

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <>{children}</>,
  Overlay: () => null,
  Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Description: ({ children, className }: any) => <p className={className}>{children}</p>,
  Close: ({ children }: any) => <span data-testid="dialog-close">{children}</span>,
  Trigger: ({ children }: any) => <>{children}</>,
}));

// ─── Mock Radix tooltip: always render content ────────────────────────────────

vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <span {...props}>{children}</span>
  ),
  Content: ({
    children,
    sideOffset: _sideOffset,
    side: _side,
    className,
    ...props
  }: {
    children: React.ReactNode;
    sideOffset?: number;
    side?: string;
    className?: string;
  }) => (
    <div data-testid="tooltip-content" className={className} {...props}>
      {children}
    </div>
  ),
}));

// ─── Mock hooks and utilities ─────────────────────────────────────────────────

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, vi.fn()],
}));

vi.mock("@/src/features/payout-disbursement", () => ({
  formatDisplayAmount: (val: string) => val,
  fromSmallestUnit: (val: string, decimals: number) => parseFloat(val) / 10 ** decimals,
  TokenBreakdown: ({ totalsByToken }: any) => (
    <span data-testid="token-breakdown">{totalsByToken?.length ?? 0} tokens</span>
  ),
  MilestoneLifecycleStatus: {
    PENDING: "pending",
    COMPLETED: "completed",
    VERIFIED: "verified",
    PAST_DUE: "past_due",
  },
  PayoutDisbursementStatus: {
    AWAITING_SIGNATURES: "awaiting_signatures",
  },
}));

vi.mock("@/utilities/donations/helpers", () => ({
  formatAddressForDisplay: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: (date: string) => "Jan 1, 2025",
}));

vi.mock("@/utilities/network", () => ({
  getChainNameById: (id: number) => "Ethereum",
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      GRANT: (slug: string, grantUid: string) => `/project/${slug}/grants/${grantUid}`,
    },
  },
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeGrant(
  overrides: Partial<PublicProjectDetailsModalGrant> = {}
): PublicProjectDetailsModalGrant {
  return {
    grantUid: "grant-1",
    projectUid: "project-1",
    projectName: "Test Project",
    projectSlug: "test-project",
    grantName: "Test Grant",
    grantProgramId: "program-1",
    grantChainId: 1,
    projectChainId: 1,
    currentPayoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
    currentAmount: "10000",
    ...overrides,
  };
}

function makeInvoice(
  overrides: Partial<CommunityPayoutInvoiceInfo> = {}
): CommunityPayoutInvoiceInfo {
  return {
    milestoneLabel: "Milestone 1",
    milestoneUID: "ms-uid-1",
    milestoneStatus: MilestoneLifecycleStatus.PENDING,
    milestoneDueDate: null,
    milestoneStatusUpdatedAt: null,
    invoiceStatus: "not_submitted",
    invoiceReceivedAt: null,
    invoiceReceivedBy: null,
    allocatedAmount: null,
    paymentStatus: "unpaid",
    paymentStatusDate: null,
    completionReason: null,
    ...overrides,
  };
}

interface RenderModalOptions {
  grant?: PublicProjectDetailsModalGrant | null;
  open?: boolean;
  invoiceRequired?: boolean;
  disbursementInfo?: any;
  agreement?: CommunityPayoutAgreementInfo | null;
  milestoneInvoices?: CommunityPayoutInvoiceInfo[];
  milestoneAllocations?: any;
}

function renderModal(options: RenderModalOptions = {}) {
  const {
    grant = makeGrant(),
    open = true,
    invoiceRequired = false,
    disbursementInfo = null,
    agreement = null,
    milestoneInvoices = [],
    milestoneAllocations = null,
  } = options;

  return render(
    <PublicProjectDetailsModal
      grant={grant}
      open={open}
      onOpenChange={vi.fn()}
      communityUID="community-1"
      invoiceRequired={invoiceRequired}
      disbursementInfo={disbursementInfo}
      agreement={agreement}
      milestoneInvoices={milestoneInvoices}
      milestoneAllocations={milestoneAllocations}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PublicProjectDetailsModal", () => {
  it("returns null when grant is null", () => {
    const { container } = renderModal({ grant: null });

    expect(container.textContent).toBe("");
  });

  it("renders project name and grant name", () => {
    renderModal({
      grant: makeGrant({ projectName: "My Project", grantName: "My Grant" }),
    });

    expect(screen.getByText("My Project")).toBeInTheDocument();
    expect(screen.getByText(/My Grant/)).toBeInTheDocument();
  });

  it("shows 'View grant' link", () => {
    renderModal();

    const link = screen.getByText("View grant");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/project/test-project/grants/grant-1");
  });

  it("shows agreement status as signed", () => {
    renderModal({
      agreement: { signed: true, signedAt: "2025-01-01T00:00:00Z" } as any,
    });

    expect(screen.getByText(/Signed/)).toBeInTheDocument();
  });

  it("shows agreement status as not signed", () => {
    renderModal({ agreement: null });

    expect(screen.getByText("Not signed")).toBeInTheDocument();
  });

  it("shows payout address with copy button", () => {
    renderModal({
      grant: makeGrant({
        currentPayoutAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
      }),
    });

    // The address should be formatted for display
    expect(screen.getByText("0xabcd...ef12")).toBeInTheDocument();
    // Copy button should have a title with the full address
    const copyButton = screen.getByTitle(
      /Click to copy: 0xabcdef1234567890abcdef1234567890abcdef12/
    );
    expect(copyButton).toBeInTheDocument();
  });

  it("shows approved amount", () => {
    renderModal({ grant: makeGrant({ currentAmount: "5000" }) });

    expect(screen.getByText("Approved:")).toBeInTheDocument();
    expect(screen.getByText("5000")).toBeInTheDocument();
  });

  it("shows disbursed token breakdown", () => {
    renderModal({
      disbursementInfo: {
        totalsByToken: [{ token: "USDC", totalAmount: "1000000", tokenDecimals: 6 }],
        status: "partial",
        history: [],
      },
    });

    expect(screen.getByTestId("token-breakdown")).toBeInTheDocument();
  });

  it("shows remaining balance progress bar", () => {
    renderModal({
      grant: makeGrant({ currentAmount: "10000" }),
      disbursementInfo: {
        totalsByToken: [{ token: "USDC", totalAmount: "5000000", tokenDecimals: 6 }],
        status: "partial",
        history: [],
      },
    });

    expect(screen.getByText(/disbursed/)).toBeInTheDocument();
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
  });

  it("shows milestone table with milestone names", () => {
    const invoices = [
      makeInvoice({ milestoneLabel: "Deliver Report", milestoneUID: "ms-1" }),
      makeInvoice({ milestoneLabel: "Final Review", milestoneUID: "ms-2" }),
    ];

    renderModal({ milestoneInvoices: invoices });

    expect(screen.getByText("Deliver Report")).toBeInTheDocument();
    expect(screen.getByText("Final Review")).toBeInTheDocument();
  });

  it("shows 'No milestones configured yet' when empty", () => {
    renderModal({ milestoneInvoices: [] });

    expect(screen.getByText("No milestones configured yet.")).toBeInTheDocument();
  });

  it("footer has only a 'Close' button", () => {
    renderModal();

    const closeButtons = screen.getAllByText("Close");
    // One is the footer Close button, the other is the dialog's X sr-only label
    const footerCloseButton = closeButtons.find(
      (el) => el.closest("button") && !el.classList.contains("sr-only")
    );
    expect(footerCloseButton).toBeTruthy();
  });

  it("does not render edit controls (no date inputs, save button, payout settings, or create disbursement button)", () => {
    renderModal({
      milestoneInvoices: [makeInvoice()],
    });

    // No date inputs
    expect(screen.queryByRole("textbox", { name: /date/i })).not.toBeInTheDocument();
    // No save button
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
    // No payout settings button
    expect(screen.queryByText(/Payout Settings/i)).not.toBeInTheDocument();
    // No create disbursement button
    expect(screen.queryByText(/Create Disbursement/i)).not.toBeInTheDocument();
  });

  it("shows invoice status column when invoiceRequired is true", () => {
    const invoices = [makeInvoice({ invoiceStatus: "received", milestoneUID: "ms-1" })];

    renderModal({ milestoneInvoices: invoices, invoiceRequired: true });

    expect(screen.getByText("Invoice Status")).toBeInTheDocument();
    expect(screen.getByText("Invoice received")).toBeInTheDocument();
  });

  it("shows invoice received date below the badge when invoiceReceivedAt is set", () => {
    const invoices = [
      makeInvoice({
        invoiceStatus: "received",
        invoiceReceivedAt: "2025-03-15T00:00:00Z",
        milestoneUID: "ms-1",
      }),
    ];

    renderModal({ milestoneInvoices: invoices, invoiceRequired: true });

    expect(screen.getByText("Invoice received")).toBeInTheDocument();
    // formatDate is mocked to return "Jan 1, 2025" for any date
    const dates = screen.getAllByText("Jan 1, 2025");
    expect(dates.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show invoice received date when invoiceReceivedAt is null", () => {
    const invoices = [
      makeInvoice({
        invoiceStatus: "not_submitted",
        invoiceReceivedAt: null,
        milestoneUID: "ms-1",
      }),
    ];

    renderModal({ milestoneInvoices: invoices, invoiceRequired: true });

    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    // No date should render — agreement is null, paymentStatusDate is null, invoiceReceivedAt is null
    expect(screen.queryByText("Jan 1, 2025")).not.toBeInTheDocument();
  });

  it("hides invoice status column when invoiceRequired is false", () => {
    const invoices = [makeInvoice({ invoiceStatus: "received", milestoneUID: "ms-1" })];

    renderModal({ milestoneInvoices: invoices, invoiceRequired: false });

    expect(screen.queryByText("Invoice Status")).not.toBeInTheDocument();
  });

  describe("currency display in allocation column", () => {
    it("should_show_currency_after_allocation_amount_when_grant_has_currency", () => {
      const invoice = makeInvoice({ milestoneUID: "ms-1", allocatedAmount: "30000" });

      renderModal({
        grant: makeGrant({ currency: "USDC" }),
        milestoneInvoices: [invoice],
      });

      // The allocation amount should appear with the currency appended
      expect(screen.getByText("USDC")).toBeInTheDocument();
    });

    it("should_show_allocation_amount_from_config_with_currency_when_invoice_has_no_allocatedAmount", () => {
      const invoice = makeInvoice({ milestoneUID: "ms-1", allocatedAmount: null });

      renderModal({
        grant: makeGrant({ currency: "OP" }),
        milestoneInvoices: [invoice],
        milestoneAllocations: [
          { id: "alloc-1", milestoneUID: "ms-1", label: "MS 1", amount: "50000" },
        ],
      });

      expect(screen.getByText("OP")).toBeInTheDocument();
    });

    it("should_show_remaining_balance_with_currency_when_grant_has_currency", () => {
      renderModal({
        grant: makeGrant({ currentAmount: "10000", currency: "USDC" }),
        disbursementInfo: {
          totalsByToken: [{ token: "USDC", totalAmount: "5000000", tokenDecimals: 6 }],
          status: "partial",
          history: [],
        },
      });

      expect(screen.getByText(/USDC remaining/)).toBeInTheDocument();
    });
  });
});
