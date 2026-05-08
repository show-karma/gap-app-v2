import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { vi } from "vitest";
import PayoutsAdminPage from "@/components/Pages/Admin/PayoutsAdminPage";

// --- Mock all hooks and dependencies ---

const mockPush = vi.fn();
const mockPathname = "/community/test-community/admin/payouts";
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: vi.fn(() => mockSearchParams),
  useParams: () => ({ communityId: "test-community-uid" }),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
    chain: { id: 10 },
  })),
  useChainId: () => 10,
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const mockUseCommunityDetails = vi.fn();
vi.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: (...args: unknown[]) => mockUseCommunityDetails(...args),
}));

const mockUseCommunityAdminAccess = vi.fn();
vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: (...args: unknown[]) => mockUseCommunityAdminAccess(...args),
}));

const mockUseKycBatchStatuses = vi.fn();
const mockUseKycConfig = vi.fn();
vi.mock("@/hooks/useKycStatus", () => ({
  useKycBatchStatuses: (...args: unknown[]) => mockUseKycBatchStatuses(...args),
  useKycConfig: (...args: unknown[]) => mockUseKycConfig(...args),
}));

const mockUseCommunityPayouts = vi.fn();
const mockUsePayoutConfigsByCommunity = vi.fn();
const mockUseSavePayoutConfig = vi.fn();

vi.mock("@/src/features/payout-disbursement", () => ({
  useCommunityPayouts: (...args: unknown[]) => mockUseCommunityPayouts(...args),
  usePayoutConfigsByCommunity: (...args: unknown[]) => mockUsePayoutConfigsByCommunity(...args),
  useSavePayoutConfig: (...args: unknown[]) => mockUseSavePayoutConfig(...args),
  CreateDisbursementModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="disbursement-modal">Disbursement Modal</div> : null,
  PayoutConfigurationModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="config-modal">Config Modal</div> : null,
  PayoutHistoryDrawer: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="history-drawer">History Drawer</div> : null,
  TokenBreakdown: ({ totalsByToken }: { totalsByToken: unknown[] }) => (
    <span data-testid="token-breakdown">{totalsByToken.length} tokens</span>
  ),
  AggregatedDisbursementStatus: {
    COMPLETED: "COMPLETED",
    PARTIAL: "PARTIAL",
    PENDING: "PENDING",
  },
  PayoutDisbursementStatus: {
    DISBURSED: "DISBURSED",
    AWAITING_SIGNATURES: "AWAITING_SIGNATURES",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
  },
  getPaidAllocationIds: vi.fn(() => []),
}));

vi.mock("@/components/Pages/Communities/Impact/ProgramFilter", () => ({
  ProgramFilter: ({ onChange }: { onChange: (id: string | null) => void }) => (
    <select data-testid="program-filter" onChange={(e) => onChange(e.target.value || null)}>
      <option value="">All</option>
      <option value="program-1_10">Program 1</option>
    </select>
  ),
}));

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: ({
    currentPage,
    totalPosts,
  }: {
    currentPage: number;
    totalPosts: number;
    setCurrentPage: (page: number) => void;
    postsPerPage: number;
  }) => (
    <div data-testid="table-pagination">
      Page {currentPage} of {Math.ceil(totalPosts / 200) || 1}
    </div>
  ),
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    isLoading?: boolean;
    type?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    title?: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      Loading...
    </div>
  ),
}));

vi.mock("@/components/KycStatusIcon", () => ({
  KycStatusBadge: ({ status }: { status: string | null }) => (
    <span data-testid="kyc-badge">{status || "unknown"}</span>
  ),
}));

vi.mock("@/components/Pages/Admin/PayoutsCsvUpload", () => ({
  PayoutsCsvUpload: ({
    onDataParsed,
    disabled,
    onDownloadExample,
  }: {
    onDataParsed: (result: unknown) => void;
    disabled: boolean;
    unmatchedProjects?: string[];
    onDownloadExample: () => void;
  }) => (
    <div data-testid="csv-upload">
      <button onClick={onDownloadExample} data-testid="download-example">
        Download Example
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root">{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children, className }: any) => <div>{children}</div>,
  SelectValue: () => <span>200</span>,
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    ADMIN: {
      NOT_AUTHORIZED: (uid: string) =>
        `You don't have permission to access this page${uid ? ` for ${uid}` : ""}.`,
    },
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    NOT_FOUND: "/404",
    PROJECT: {
      OVERVIEW: (slug: string) => `/project/${slug}`,
      GRANT: (slug: string, grantId: string) => `/project/${slug}/grant/${grantId}`,
    },
  },
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/utilities/validation", () => ({
  sanitizeNumericInput: vi.fn((v: string) => v),
}));

vi.mock("viem", () => ({
  formatUnits: vi.fn((value: bigint, decimals: number) => "100.00"),
  isAddress: vi.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Test helpers ---

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// --- Mock data factories ---

function createMockPayout(overrides: Record<string, any> = {}) {
  return {
    project: {
      uid: "project-1",
      title: "Test Project",
      slug: "test-project",
      chainID: 10,
      adminPayoutAddress: "0x1111111111111111111111111111111111111111",
      ...overrides.project,
    },
    grant: {
      uid: "grant-1",
      title: "Test Grant",
      programId: "program-1",
      chainID: 10,
      adminPayoutAmount: "1000",
      ...overrides.grant,
    },
    disbursements: {
      totalsByToken: [],
      status: "PENDING",
      history: [],
      ...overrides.disbursements,
    },
  };
}

// --- Tests ---

describe("PayoutsAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock returns
    mockUseAuth.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    mockUseCommunityDetails.mockReturnValue({
      data: { uid: "community-uid", name: "Test Community" },
      isLoading: false,
      error: null,
    });

    mockUseCommunityAdminAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
    });

    mockUseKycConfig.mockReturnValue({
      config: null,
      isEnabled: false,
    });

    mockUseKycBatchStatuses.mockReturnValue({
      statuses: new Map(),
      isLoading: false,
    });

    mockUseCommunityPayouts.mockReturnValue({
      data: { payload: [], pagination: { totalCount: 0 } },
      isLoading: false,
      invalidate: vi.fn(),
    });

    mockUsePayoutConfigsByCommunity.mockReturnValue({
      data: null,
    });

    mockUseSavePayoutConfig.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  describe("loading state", () => {
    it("renders spinner when auth is not ready", () => {
      mockUseAuth.mockReturnValue({ ready: false, authenticated: false });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("renders spinner when admin access is loading", () => {
      mockUseCommunityAdminAccess.mockReturnValue({
        hasAccess: false,
        isLoading: true,
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("renders spinner when payouts are loading", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: null,
        isLoading: true,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("renders spinner when community details are loading", () => {
      mockUseCommunityDetails.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  describe("access denied", () => {
    it("shows not authorized message when user lacks admin access", () => {
      mockUseCommunityAdminAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText(/don't have permission to access this page/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders table with column headers when no payouts exist", () => {
      renderWithProviders(<PayoutsAdminPage />);

      expect(screen.getByText("Project")).toBeInTheDocument();
      expect(screen.getByText("Grant")).toBeInTheDocument();
      expect(screen.getByText("Payout Address")).toBeInTheDocument();
      expect(screen.getByText("Total Grant")).toBeInTheDocument();
      expect(screen.getByText("Total Disbursed")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders pagination showing page 1", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByTestId("table-pagination")).toBeInTheDocument();
    });
  });

  describe("data rendered", () => {
    const mockPayouts = [
      createMockPayout(),
      createMockPayout({
        project: {
          uid: "project-2",
          title: "Second Project",
          slug: "second-project",
          chainID: 10,
          adminPayoutAddress: "",
        },
        grant: {
          uid: "grant-2",
          title: "Second Grant",
          programId: "program-1",
          chainID: 10,
          adminPayoutAmount: "",
        },
      }),
    ];

    beforeEach(() => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: mockPayouts,
          pagination: { totalCount: 2 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });
    });

    it("renders project names in the table", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText("Second Project")).toBeInTheDocument();
    });

    it("renders grant names in the table", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("Test Grant")).toBeInTheDocument();
      expect(screen.getByText("Second Grant")).toBeInTheDocument();
    });

    it("renders truncated payout address for configured grants", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("0x1111...1111")).toBeInTheDocument();
    });

    it("renders dash for unconfigured payout addresses", () => {
      renderWithProviders(<PayoutsAdminPage />);
      // The second project has no payout address, should show dash
      const dashes = screen.getAllByText("\u2014");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("renders payout amount for configured grants", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("1,000")).toBeInTheDocument();
    });

    it("renders Pending status for grants without disbursement history", () => {
      renderWithProviders(<PayoutsAdminPage />);
      const pendingButtons = screen.getAllByText("Pending");
      expect(pendingButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("disbursement statuses", () => {
    it("renders Disbursed status when aggregated status is COMPLETED", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [
            createMockPayout({
              disbursements: {
                totalsByToken: [{ totalAmount: "1000000", tokenDecimals: 6 }],
                status: "COMPLETED",
                history: [{ status: "DISBURSED" }],
              },
            }),
          ],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("Disbursed")).toBeInTheDocument();
    });

    it("renders Awaiting Signatures status", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [
            createMockPayout({
              disbursements: {
                totalsByToken: [],
                status: "PENDING",
                history: [{ status: "AWAITING_SIGNATURES" }],
              },
            }),
          ],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("Awaiting Signatures")).toBeInTheDocument();
    });
  });

  describe("grant selection", () => {
    it("disables checkbox when payout address is missing", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [
            createMockPayout({
              project: {
                uid: "project-no-addr",
                title: "No Address Project",
                slug: "no-address",
                chainID: 10,
                adminPayoutAddress: "",
              },
              grant: {
                uid: "grant-no-addr",
                title: "No Address Grant",
                programId: "program-1",
                chainID: 10,
                adminPayoutAmount: "100",
              },
            }),
          ],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      // First is select-all, second is the row
      const rowCheckbox = checkboxes[1];
      expect(rowCheckbox).toBeDisabled();
    });

    it("enables checkbox when payout address and amount are valid", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      const rowCheckbox = checkboxes[1];
      expect(rowCheckbox).not.toBeDisabled();
    });

    it("shows Create Disbursement button when grants are selected", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      expect(screen.getByText(/Create Disbursement/)).toBeInTheDocument();
    });

    it("select all checkbox selects only eligible grants", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [
            createMockPayout(),
            createMockPayout({
              project: {
                uid: "project-2",
                title: "No Addr",
                slug: "no-addr",
                chainID: 10,
                adminPayoutAddress: "",
              },
              grant: {
                uid: "grant-2",
                title: "Grant 2",
                programId: "p1",
                chainID: 10,
                adminPayoutAmount: "100",
              },
            }),
          ],
          pagination: { totalCount: 2 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      const selectAll = screen.getAllByRole("checkbox")[0];
      fireEvent.click(selectAll);

      // Only 1 eligible grant should be selected, button shows (1)
      expect(screen.getByText(/Create Disbursement \(1\)/)).toBeInTheDocument();
    });
  });

  describe("KYC column", () => {
    it("does not render KYC column when KYC is disabled", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.queryByText("KYC/KYB")).not.toBeInTheDocument();
    });

    it("renders KYC column when KYC is enabled", () => {
      mockUseKycConfig.mockReturnValue({
        config: { enabled: true },
        isEnabled: true,
      });

      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.getByText("KYC/KYB")).toBeInTheDocument();
    });
  });

  describe("CSV upload", () => {
    it("does not show CSV upload when no program is selected", () => {
      renderWithProviders(<PayoutsAdminPage />);
      expect(screen.queryByTestId("csv-upload")).not.toBeInTheDocument();
    });
  });

  describe("modal interactions", () => {
    const mockPayouts = [createMockPayout()];

    beforeEach(() => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: mockPayouts,
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });
    });

    it("opens disbursement modal when Create Disbursement button is clicked", () => {
      renderWithProviders(<PayoutsAdminPage />);

      // Select a grant first
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      // Click Create Disbursement
      const createButton = screen.getByText(/Create Disbursement/);
      fireEvent.click(createButton);

      expect(screen.getByTestId("disbursement-modal")).toBeInTheDocument();
    });

    it("opens history drawer when clicking a status button", () => {
      renderWithProviders(<PayoutsAdminPage />);

      // Click on the Pending status button to open history drawer
      const statusButton = screen.getByTitle("Click to view payout history");
      fireEvent.click(statusButton);

      expect(screen.getByTestId("history-drawer")).toBeInTheDocument();
    });

    it("opens config modal when clicking the configure button", () => {
      renderWithProviders(<PayoutsAdminPage />);

      // Click on the config (cog) button in actions column
      const configButton = screen.getByTitle("Configure payout settings");
      fireEvent.click(configButton);

      expect(screen.getByTestId("config-modal")).toBeInTheDocument();
    });
  });

  describe("CSV upload with program selected", () => {
    beforeEach(() => {
      // Simulate a selected program via URL search params
      const searchParamsWithProgram = new URLSearchParams("programId=program-1_10");

      vi.mocked(useSearchParams).mockReturnValueOnce(
        searchParamsWithProgram as unknown as ReturnType<typeof useSearchParams>
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("shows CSV upload widget when a program is selected", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      expect(screen.getByTestId("csv-upload")).toBeInTheDocument();
    });

    it("renders download example button in CSV upload", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      expect(screen.getByTestId("download-example")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("updates URL when clicking sort on project column", () => {
      mockUseCommunityPayouts.mockReturnValue({
        data: {
          payload: [createMockPayout()],
          pagination: { totalCount: 1 },
        },
        isLoading: false,
        invalidate: vi.fn(),
      });

      renderWithProviders(<PayoutsAdminPage />);

      fireEvent.click(screen.getByText("Project"));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("sortBy=project_title"));
    });
  });

  describe("error handling", () => {
    it("redirects to 404 when community is not found", () => {
      mockUseCommunityDetails.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: "Community not found" },
      });

      renderWithProviders(<PayoutsAdminPage />);

      expect(mockPush).toHaveBeenCalledWith("/404");
    });
  });
});
