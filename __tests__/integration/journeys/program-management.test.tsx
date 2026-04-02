import { vi } from "vitest";
/**
 * Integration tests: Program management user journey
 *
 * Tests the ManagePrograms component at a high level, verifying that the
 * program management page renders correctly in various states: loading,
 * authenticated, unauthenticated, and with program data.
 *
 * The ManagePrograms component is complex with many dependencies,
 * so we mock heavy sub-components and test the orchestration layer.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock nuqs
const mockQueryStates: Record<string, any> = {};

vi.mock("nuqs", () => ({
  useQueryState: vi.fn((key: string, options?: any) => {
    const defaultValue = options?.defaultValue ?? "";
    if (!mockQueryStates[key]) {
      const setter = vi.fn((val: any) => {
        mockQueryStates[key] = [val ?? defaultValue, setter];
      });
      mockQueryStates[key] = [defaultValue, setter];
    }
    return mockQueryStates[key];
  }),
}));

// Mock useAuth - the mock factory returns from a global holder
const _authHolder = { current: { authenticated: true, login: vi.fn() } };
(global as any).__programMgmtAuthState = _authHolder;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => (global as any).__programMgmtAuthState.current),
}));

// Mock wagmi
const _walletHolder = {
  address: "0x1234567890123456789012345678901234567890" as string | undefined,
};
(global as any).__programMgmtWallet = _walletHolder;

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: (global as any).__programMgmtWallet.address,
    isConnected: Boolean((global as any).__programMgmtWallet.address),
  })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  useChainId: vi.fn(() => 10),
  useWalletClient: vi.fn(() => ({ data: null })),
  usePublicClient: vi.fn(() => ({ data: null })),
  useSwitchChain: vi.fn(() => ({ switchChain: vi.fn(), chains: [] })),
  useWriteContract: vi.fn(() => ({ writeContractAsync: vi.fn() })),
  WagmiProvider: ({ children }: any) => children,
  createConfig: vi.fn(),
}));

// Mock EAS signer
vi.mock("@/utilities/eas-wagmi-utils", () => ({
  useSigner: vi.fn(() => null),
}));

// Mock RBAC permissions - controls staff/admin access
const _permissionsHolder = {
  data: {
    roles: { primaryRole: "SUPER_ADMIN", roles: ["SUPER_ADMIN"], reviewerTypes: [] },
    permissions: [],
    hasAdminAccessInAnyCommunity: true,
    isRegistryAdmin: true,
    isProgramCreator: true,
  } as any,
};
(global as any).__programMgmtPermissions = _permissionsHolder;

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(() => ({
    data: (global as any).__programMgmtPermissions.data,
    isLoading: false,
    isError: false,
  })),
}));

// Mock fetchData - use a shared reference accessible after mock hoisting
vi.mock("@/utilities/fetchData", () => {
  const fn = vi.fn();
  return { __esModule: true, default: fn, _mockFn: fn };
});

// Mock ProgramRegistryService
vi.mock("@/services/programRegistry.service", () => ({
  ProgramRegistryService: {
    getPrograms: vi.fn(),
    getMyPrograms: vi.fn(),
    getProgram: vi.fn(),
  },
}));

// Mock sub-components to avoid deep dependency chains
vi.mock("@/components/Pages/ProgramRegistry/AddProgram", () => ({
  __esModule: true,
  default: () => <div data-testid="add-program-form">Add Program Form</div>,
}));

vi.mock("@/components/Pages/ProgramRegistry/ManageProgramList", () => ({
  ManageProgramList: ({ grantPrograms }: any) => (
    <div data-testid="manage-program-list">
      {grantPrograms?.map((p: any) => (
        <div key={p._id} data-testid={`program-${p._id}`}>
          {p.metadata?.title || p.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/Pages/ProgramRegistry/MyProgramList", () => ({
  MyProgramList: ({ grantPrograms }: any) => (
    <div data-testid="my-program-list">
      {grantPrograms?.map((p: any) => (
        <div key={p._id} data-testid={`my-program-${p._id}`}>
          {p.metadata?.title || p.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/Pages/ProgramRegistry/ProgramDetailsDialog", () => ({
  ProgramDetailsDialog: () => (
    <div data-testid="program-details-dialog">Program Details Dialog</div>
  ),
}));

vi.mock("@/components/Pages/ProgramRegistry/SearchDropdown", () => ({
  SearchDropdown: () => <div data-testid="search-dropdown">Search Dropdown</div>,
}));

vi.mock("@/components/Pages/ProgramRegistry/Loading/Programs", () => ({
  LoadingProgramTable: () => <div data-testid="loading-table">Loading...</div>,
}));

vi.mock("@/components/Utilities/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination">Pagination</div>,
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("react-hot-toast", () => {
  return { __esModule: true, default: { success: vi.fn(), error: vi.fn() } };
});

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/components/Pages/ProgramRegistry/programUtils", () => ({
  getProgramIdForUrl: vi.fn((p: any) => p?._id || ""),
  normalizeGrantTypesArray: vi.fn((arr: any) => arr || []),
}));

// ---------------------------------------------------------------------------
// Import component under test and get mock references
// ---------------------------------------------------------------------------
import { ManagePrograms } from "@/components/Pages/ProgramRegistry/ManagePrograms";

// Get the mock function reference after vi.mock hoisting
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockFetchData = require("@/utilities/fetchData")._mockFn as vi.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPrograms = [
  {
    _id: "prog-1",
    metadata: { title: "Season 5 Grants", description: "Season 5 funding" },
    chainID: 10,
    isValid: "accepted",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "prog-2",
    metadata: { title: "Retro Funding", description: "Retroactive public goods" },
    chainID: 10,
    isValid: "accepted",
    createdAt: "2024-02-01T00:00:00.000Z",
  },
];

function renderManagePrograms() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ManagePrograms />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ManagePrograms - Program management journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockQueryStates)) {
      delete mockQueryStates[key];
    }
    _authHolder.current = { authenticated: true, login: vi.fn() };
    _walletHolder.address = "0x1234567890123456789012345678901234567890";
    _permissionsHolder.data = {
      roles: { primaryRole: "SUPER_ADMIN", roles: ["SUPER_ADMIN"], reviewerTypes: [] },
      permissions: [],
      hasAdminAccessInAnyCommunity: true,
      isRegistryAdmin: true,
      isProgramCreator: true,
    };

    // Default: fetchData returns programs list in [data, error] tuple format
    mockFetchData.mockResolvedValue([
      { payload: mockPrograms, pagination: { totalCount: 2, page: 1, limit: 10 } },
      null,
      null,
      200,
    ]);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe("rendering", () => {
    it("renders the manage programs page with back link", async () => {
      renderManagePrograms();

      await waitFor(() => {
        expect(screen.getByText(/Back to Programs Explorer/)).toBeInTheDocument();
      });
    });

    it("renders search controls after data loads", async () => {
      renderManagePrograms();

      await waitFor(() => {
        expect(screen.getByTestId("manage-program-list")).toBeInTheDocument();
      });

      // There may be multiple search dropdowns (for different filter categories)
      const searchDropdowns = screen.getAllByTestId("search-dropdown");
      expect(searchDropdowns.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated state
  // -------------------------------------------------------------------------

  describe("unauthenticated state", () => {
    it("prompts login when wallet is not connected", async () => {
      _walletHolder.address = undefined;
      _authHolder.current = { authenticated: false, login: vi.fn() };

      renderManagePrograms();

      // The component renders NotAllowedCases which shows login prompt
      await waitFor(() => {
        expect(screen.getByText("You need to login to access this page")).toBeInTheDocument();
      });

      // Login button should be present
      const loginButton = screen.getByRole("button", { name: /Login/ });
      expect(loginButton).toBeInTheDocument();

      // Admin-only content should NOT be visible
      expect(screen.queryByText("Manage Grant Programs")).not.toBeInTheDocument();
      expect(screen.queryByTestId("manage-program-list")).not.toBeInTheDocument();
    });

    it("calls login when Login button is clicked", async () => {
      _walletHolder.address = undefined;
      const mockLogin = vi.fn();
      _authHolder.current = { authenticated: false, login: mockLogin };

      renderManagePrograms();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Login/ })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Login/ }));

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("loading state", () => {
    it("shows loading indicator while fetching programs", () => {
      // fetchData never resolves
      mockFetchData.mockReturnValue(new Promise(() => {}));

      renderManagePrograms();

      // The loading table mock should appear
      expect(screen.getByTestId("loading-table")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Programs loaded
  // -------------------------------------------------------------------------

  describe("programs loaded", () => {
    it("displays program list after data loads", async () => {
      renderManagePrograms();

      await waitFor(() => {
        expect(screen.getByTestId("manage-program-list")).toBeInTheDocument();
      });
    });

    it("shows program names in the list", async () => {
      renderManagePrograms();

      await waitFor(() => {
        expect(screen.getByText("Season 5 Grants")).toBeInTheDocument();
        expect(screen.getByText("Retro Funding")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe("empty state", () => {
    it("handles empty program list", async () => {
      mockFetchData.mockResolvedValue([
        { payload: [], pagination: { totalCount: 0, page: 1, limit: 10 } },
        null,
        null,
        200,
      ]);

      renderManagePrograms();

      // Wait for the query to resolve
      await waitFor(() => {
        // The component should render without crashing
        expect(document.body.textContent).not.toBe("");
      });

      // With no programs, program-specific elements should not exist
      expect(screen.queryByTestId("program-prog-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("program-prog-2")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  describe("error state", () => {
    it("shows empty state message when API returns error", async () => {
      mockFetchData.mockResolvedValue([null, "Server error", null, 500]);

      renderManagePrograms();

      // The component catches errors in getGrantPrograms and returns { programs: [], count: 0 },
      // which renders the "No grant program found" empty state.
      await waitFor(() => {
        expect(screen.getByText("No grant program found")).toBeInTheDocument();
      });

      // Program list should not be rendered
      expect(screen.queryByTestId("manage-program-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("program-prog-1")).not.toBeInTheDocument();
    });
  });
});
