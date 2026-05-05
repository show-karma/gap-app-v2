import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ControlCenterTable,
  type ControlCenterTableProps,
  type TableRow,
} from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";

/**
 * Mock Radix tooltip primitives so that tooltip content is always rendered
 * in the DOM (Radix tooltips require pointer events that jsdom cannot simulate).
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

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="table-pagination" data-total={props.totalPosts} />,
}));

vi.mock("@/components/Pages/Admin/ControlCenter/ControlCenterColumns", () => ({
  SortIcon: ({ column }: { column: string }) => (
    <span data-testid={`sort-icon-${column}`}>sort</span>
  ),
}));

vi.mock("@/components/Pages/Admin/ControlCenter/StatusBadges", () => ({
  AgreementBadge: () => <div data-testid="agreement-badge">Agreement</div>,
  PendingDisbursalBadge: () => <div data-testid="pending-disbursal-badge">Pending</div>,
  ProgressCell: () => <div data-testid="progress-cell">Progress</div>,
}));

vi.mock("@/components/KycStatusIcon", () => ({
  KycStatusBadge: () => <div data-testid="kyc-badge">KYC</div>,
}));

vi.mock("@/src/features/payout-disbursement", () => ({
  formatDisplayAmount: (val: string) => val,
  TokenBreakdown: ({ totalsByToken }: any) => (
    <div data-testid="token-breakdown">{totalsByToken?.length ?? 0} tokens</div>
  ),
}));

vi.mock("@/utilities/donations/helpers", () => ({
  formatAddressForDisplay: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTableRow(overrides: Partial<TableRow> = {}): TableRow {
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
    currentAmount: "1000",
    ...overrides,
  };
}

function makeDefaultProps(
  overrides: Partial<ControlCenterTableProps> = {}
): ControlCenterTableProps {
  return {
    paginatedData: [makeTableRow()],
    selectedGrants: new Set<string>(),
    selectableGrants: [],
    onSelectGrant: vi.fn(),
    onSelectAll: vi.fn(),
    onOpenDetails: vi.fn(),
    onSort: vi.fn(),
    sortBy: undefined,
    sortOrder: undefined,
    isKycEnabled: false,
    isLoadingKycStatuses: false,
    kycStatuses: new Map(),
    disbursementMap: {},
    agreementMap: {},
    invoiceMap: {},
    paidMilestoneCountMap: {},
    invoiceRequiredMap: {},
    getCheckboxDisabledState: () => ({ disabled: false, reason: null }),
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    readOnly: false,
    currentPage: 1,
    onPageChange: vi.fn(),
    itemsPerPage: 25,
    totalItems: 1,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ControlCenterTable", () => {
  describe("readOnly mode", () => {
    it("does not render checkbox inputs when readOnly is true", () => {
      render(<ControlCenterTable {...makeDefaultProps({ readOnly: true })} />);

      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes).toHaveLength(0);
    });

    it("does not render Actions column header when readOnly is true", () => {
      render(<ControlCenterTable {...makeDefaultProps({ readOnly: true })} />);

      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    });

    it("does not render cog/settings button when readOnly is true", () => {
      render(<ControlCenterTable {...makeDefaultProps({ readOnly: true })} />);

      const settingsButton = screen.queryByTitle("Configure payout settings");
      expect(settingsButton).not.toBeInTheDocument();
    });

    it("renders checkboxes when readOnly is false", () => {
      render(<ControlCenterTable {...makeDefaultProps({ readOnly: false })} />);

      const checkboxes = screen.getAllByRole("checkbox");
      // Header checkbox + one row checkbox
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("data rendering", () => {
    it("renders project names and grant names", () => {
      const data = [
        makeTableRow({
          projectName: "Alpha Project",
          grantName: "Alpha Grant",
          grantUid: "g1",
          projectUid: "p1",
        }),
        makeTableRow({
          projectName: "Beta Project",
          grantName: "Beta Grant",
          grantUid: "g2",
          projectUid: "p2",
        }),
      ];

      render(<ControlCenterTable {...makeDefaultProps({ paginatedData: data, totalItems: 2 })} />);

      expect(screen.getByText("Alpha Project")).toBeInTheDocument();
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument();
      expect(screen.getByText("Beta Project")).toBeInTheDocument();
      expect(screen.getByText("Beta Grant")).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("renders pagination when totalItems > 0", () => {
      render(<ControlCenterTable {...makeDefaultProps({ totalItems: 10 })} />);

      expect(screen.getByTestId("table-pagination")).toBeInTheDocument();
    });

    it("does not render pagination when totalItems is 0", () => {
      render(<ControlCenterTable {...makeDefaultProps({ paginatedData: [], totalItems: 0 })} />);

      expect(screen.queryByTestId("table-pagination")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No projects found' message when data is empty", () => {
      render(<ControlCenterTable {...makeDefaultProps({ paginatedData: [], totalItems: 0 })} />);

      expect(screen.getByText("No projects found matching your filters.")).toBeInTheDocument();
    });

    it("shows clear filters button when hasActiveFilters is true and data is empty", () => {
      render(
        <ControlCenterTable
          {...makeDefaultProps({
            paginatedData: [],
            totalItems: 0,
            hasActiveFilters: true,
          })}
        />
      );

      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });
  });

  describe("sort headers", () => {
    it("calls onSort when Project header is clicked", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      render(<ControlCenterTable {...makeDefaultProps({ onSort })} />);

      await user.click(screen.getByText("Project"));

      expect(onSort).toHaveBeenCalledWith("project_title");
    });

    it("calls onSort when Total Grant header is clicked", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      render(<ControlCenterTable {...makeDefaultProps({ onSort })} />);

      await user.click(screen.getByText("Total Grant"));

      expect(onSort).toHaveBeenCalledWith("payout_amount");
    });

    it("calls onSort when Disbursed header is clicked", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      render(<ControlCenterTable {...makeDefaultProps({ onSort })} />);

      await user.click(screen.getByText("Disbursed"));

      expect(onSort).toHaveBeenCalledWith("disbursed_amount");
    });
  });
});
