import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { PublicControlCenter } from "@/components/Pages/Communities/Financials/PublicControlCenter";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import {
  useCommunityPayoutsPublic,
  usePayoutConfigsByCommunityPublic,
} from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/community/test-community/financials"),
}));

// ─── Mock data hooks ──────────────────────────────────────────────────────────

jest.mock("@/hooks/communities/useCommunityDetails");
jest.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement");

const mockUseCommunityDetails = useCommunityDetails as jest.MockedFunction<
  typeof useCommunityDetails
>;
const mockUseCommunityPayoutsPublic = useCommunityPayoutsPublic as jest.MockedFunction<
  typeof useCommunityPayoutsPublic
>;
const mockUsePayoutConfigsByCommunityPublic =
  usePayoutConfigsByCommunityPublic as jest.MockedFunction<
    typeof usePayoutConfigsByCommunityPublic
  >;

// ─── Mock child components ────────────────────────────────────────────────────

jest.mock("@/components/Pages/Admin/ControlCenter/FilterToolbar", () => ({
  FilterToolbar: (props: any) => <div data-testid="filter-toolbar">FilterToolbar</div>,
}));

jest.mock("@/components/Pages/Admin/ControlCenter/ControlCenterTable", () => ({
  ControlCenterTable: (props: any) => (
    <div data-testid="control-center-table" data-readonly={props.readOnly}>
      ControlCenterTable
    </div>
  ),
}));

jest.mock("@/components/Pages/Communities/Financials/PublicProjectDetailsModal", () => ({
  PublicProjectDetailsModal: () => <div data-testid="public-project-details-modal">Modal</div>,
}));

jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/utilities/pages", () => ({
  PAGES: { NOT_FOUND: "/not-found" },
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

const mockCommunity = {
  uid: "community-uid-123",
  name: "Test Community",
};

const mockPayoutsData = {
  payload: [
    {
      project: {
        uid: "proj-1",
        title: "Project Alpha",
        slug: "project-alpha",
        chainID: 1,
        adminPayoutAddress: "0xabc123",
      },
      grant: {
        uid: "grant-1",
        title: "Grant Alpha",
        programId: "prog-1",
        chainID: 1,
        payoutAmount: "5000",
        adminPayoutAmount: null,
        invoiceRequired: false,
      },
      disbursements: {
        totalsByToken: [],
        status: "not_started",
        history: [],
      },
      agreement: null,
      milestoneInvoices: [],
      paidMilestoneCount: 0,
    },
  ],
  pagination: { totalCount: 1 },
};

describe("PublicControlCenter", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();

    // Default mocks: everything loaded successfully
    mockUseCommunityDetails.mockReturnValue({
      data: mockCommunity,
      isLoading: false,
      error: null,
    } as any);

    mockUseCommunityPayoutsPublic.mockReturnValue({
      data: mockPayoutsData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockUsePayoutConfigsByCommunityPublic.mockReturnValue({
      data: [],
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("does not block table rendering while community details are loading", () => {
    mockUseCommunityDetails.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<PublicControlCenter />, { wrapper });

    // Table should still render — community details don't block it
    expect(screen.getByText("Financials")).toBeInTheDocument();
    expect(screen.queryByTestId("control-center-table")).toBeInTheDocument();
  });

  it("shows loading skeleton when payouts are loading", () => {
    mockUseCommunityPayoutsPublic.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<PublicControlCenter />, { wrapper });

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("control-center-table")).not.toBeInTheDocument();
  });

  it("shows error state with retry button when community fetch fails", () => {
    mockUseCommunityDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Network error" },
    } as any);

    render(<PublicControlCenter />, { wrapper });

    expect(screen.getByText("Failed to load community data")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows payouts error state with retry button", () => {
    mockUseCommunityPayoutsPublic.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: "Payout fetch failed" },
      refetch: jest.fn(),
    } as any);

    render(<PublicControlCenter />, { wrapper });

    expect(screen.getByText("Failed to load payouts data. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders 'Financials' title and subtitle", () => {
    render(<PublicControlCenter />, { wrapper });

    expect(screen.getByText("Financials")).toBeInTheDocument();
    expect(
      screen.getByText("Overview of project agreements, milestones, and payments")
    ).toBeInTheDocument();
  });

  it("renders FilterToolbar", () => {
    render(<PublicControlCenter />, { wrapper });

    expect(screen.getByTestId("filter-toolbar")).toBeInTheDocument();
  });

  it("renders ControlCenterTable with readOnly prop", () => {
    render(<PublicControlCenter />, { wrapper });

    const table = screen.getByTestId("control-center-table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute("data-readonly", "true");
  });

  it("redirects to not-found for missing communities", () => {
    mockUseCommunityDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Community not found" },
    } as any);

    render(<PublicControlCenter />, { wrapper });

    expect(mockPush).toHaveBeenCalledWith("/not-found");
  });

  it("redirects to not-found for 422 error", () => {
    mockUseCommunityDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "422 Unprocessable Entity" },
    } as any);

    render(<PublicControlCenter />, { wrapper });

    expect(mockPush).toHaveBeenCalledWith("/not-found");
  });
});
