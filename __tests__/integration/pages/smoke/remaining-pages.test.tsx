import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";

/**
 * Smoke tests for the remaining client-side pages that read params, call
 * hooks, and render conditional UI. We mock the relevant data hooks to a
 * stable state and assert the page renders one of its expected branches.
 */

const buildClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={buildClient()}>{children}</QueryClientProvider>
);

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    useParams: () => ({ communityId: "c1", programId: "p1", applicationId: "app-1" }),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/test",
  };
});

vi.mock("nuqs", () => ({
  useQueryState: <T,>(_name: string, opts?: { defaultValue?: T }) => [
    opts?.defaultValue ?? null,
    vi.fn(),
  ],
}));

// Donation history hook
vi.mock("@/hooks/donation/useDonationHistory", () => ({
  useDonationHistory: () => ({ data: [], isLoading: false, error: null }),
}));

// Auth hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, user: null }),
}));

// Community programs hooks
vi.mock("@/hooks/usePrograms", () => ({
  useCommunityPrograms: () => ({
    data: [{ programId: "p1", chainID: 1, metadata: { title: "Program One" } }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useFundingPlatform", () => ({
  useFundingPrograms: () => ({
    programs: [{ programId: "p1", chainID: 1, metadata: { title: "Program One" } }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useApplication: () => ({ application: null, isLoading: false, error: null, refetch: vi.fn() }),
  useApplicationStatus: () => ({ updateStatus: vi.fn(), isUpdating: false, error: null }),
  useApplicationComments: () => ({ comments: [], isLoading: false, error: null }),
  useApplicationVersions: () => ({ versions: [], isLoading: false, error: null }),
  useDeleteApplication: () => ({ deleteApplication: vi.fn(), isDeleting: false, error: null }),
  useFundingApplications: () => ({
    applications: [],
    total: 0,
    page: 1,
    totalPages: 1,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProgramConfig: () => ({ data: null, config: null, isLoading: false, error: null }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: () => ({ programs: [], isLoading: false }),
}));

vi.mock("@/hooks/useCommunityProjects", () => ({
  useCommunityProjects: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useCommunityProjectUpdates", () => ({
  useCommunityProjectUpdates: () => ({
    data: { payload: [], pagination: { totalCount: 0, page: 1, pageSize: 25 } },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCommunityMilestoneAllocations", () => ({
  useCommunityMilestoneAllocations: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => ({ goBack: vi.fn(), backHref: "/" }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: () => ({ data: null, isLoading: false }),
  useKycStatus: () => ({ status: null, isLoading: false }),
}));

// Whitelabel context
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false, slug: null }),
}));

// React Query for /donate page.tsx
vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue({
    uid: "c1",
    details: { name: "Test", slug: "test" },
  }),
}));

// RBAC
vi.mock("@/src/core/rbac", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/src/core/rbac");
  return {
    ...actual,
    FundingPlatformGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AdminOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useIsFundingPlatformAdmin: () => true,
  };
});

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({ isLoading: false, can: () => true }),
  PermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Inner UI mocks
vi.mock("@/components/Pages/Communities/CommunityProjectEvaluatorPage", () => ({
  CommunityProjectEvaluatorPage: () => (
    <div data-testid="karma-ai-evaluator">CommunityProjectEvaluator</div>
  ),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner">Spinner</div>,
}));

vi.mock("@/components/Pages/Communities/Impact/SearchWithValueDropdown", () => ({
  SearchWithValueDropdown: () => null,
}));

vi.mock("@/components/Pages/Community/Updates/CommunityMilestoneCard", () => ({
  CommunityMilestoneCard: () => null,
}));

vi.mock("@/components/Pages/Community/Updates/SimplePagination", () => ({
  SimplePagination: () => null,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: () => null,
}));

vi.mock("@/components/Utilities/LoadingOverlay", () => ({
  LoadingOverlay: () => null,
}));

vi.mock("@/components/FundingPlatform/CreateProgramModal", () => ({
  CreateProgramModal: () => null,
}));
vi.mock("@/components/FundingPlatform/Dashboard/card", () => ({
  FundingPlatformStatsCard: () => <div data-testid="funding-platform-stats-card" />,
}));
vi.mock("@/components/FundingPlatform/NoProgramsEmptyState", () => ({
  NoProgramsEmptyState: () => <div data-testid="no-programs-empty">Empty</div>,
}));
vi.mock("@/components/FundingPlatform/ProgramSetupStatus", () => ({
  ProgramSetupStatus: () => null,
  hasFormConfigured: () => true,
}));

vi.mock("@/services/fundingPlatformService", () => ({
  fundingPlatformService: {
    programs: {
      toggleProgramStatus: vi.fn().mockResolvedValue(true),
    },
  },
}));

vi.mock("@/components/FundingPlatform", () => ({
  ApplicationListWithAPI: () => <div data-testid="application-list-with-api" />,
}));

// Application view sub-components
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationHeader", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab", () => ({
  ApplicationTab: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTabs", () => ({
  ApplicationTabs: () => null,
  TabIcons: {},
}));
vi.mock("@/components/FundingPlatform/ApplicationView/AIAnalysisTab", () => ({
  AIAnalysisTab: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/DiscussionTab", () => ({
  DiscussionTab: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/TabPanel", () => ({
  TabPanel: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/HeaderActions", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/MoreActionsDropdown", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/StatusChangeInline", () => ({
  StatusChangeInline: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/EditApplicationModal", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/EditPostApprovalModal", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/components/FundingPlatform/ApplicationView/DeleteApplicationModal", () => ({
  __esModule: true,
  default: () => null,
}));

// /donations DonationHistoryList
vi.mock("@/app/donations/components/DonationHistoryList", () => ({
  DonationHistoryList: ({ donations }: { donations: unknown[] }) => (
    <div data-testid="donation-history-list">count={donations.length}</div>
  ),
  DonationHistorySkeleton: () => <div data-testid="donation-history-skeleton">Loading</div>,
}));

// /utilities helpers
vi.mock("@/utilities/project-lookup", () => ({
  findProjectOptionBySlugOrUid: () => null,
  projectsToOptions: () => [],
}));

vi.mock("@/utilities/sorting/communityMilestoneSort", () => ({
  sortCommunityMilestones: (m: unknown[]) => m,
}));

vi.mock("@/utilities/fundingPlatformUrls", () => ({
  getProgramApplyUrl: (cId: string, pId: string) => `/c/${cId}/p/${pId}`,
}));

vi.mock("@/utilities/formatCurrency", () => ({
  __esModule: true,
  default: (n: number) => `$${n}`,
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: (d: string) => d,
}));

const renderClientPage = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const { default: Page } = await importer();
  return render(<Page />, { wrapper: Wrapper });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/donations page", () => {
  it("renders empty-state when no donations", async () => {
    await renderClientPage(() => import("@/app/donations/page"));
    expect(screen.getByRole("heading", { name: /my donations/i })).toBeInTheDocument();
    expect(screen.getByText(/no donations yet/i)).toBeInTheDocument();
  });
});

describe("/community/[communityId]/donate program-select page", () => {
  it("renders programs select when loaded", async () => {
    await renderClientPage(() => import("@/app/community/[communityId]/donate/page"));
    // Page either renders the loading state, redirect spinner, or the program
    // selector — all acceptable proof that the module loads & mounts.
    const heading = screen.queryByText(/select.*program/i);
    const loadingSpinner = screen.queryByText(/loading programs/i);
    expect(heading || loadingSpinner).not.toBeNull();
  });
});

describe("/community/[communityId]/(with-header)/updates page", () => {
  it("renders updates page with filter controls", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/(with-header)/updates/page")
    );
    // Loose: the page should at minimum mount without throwing — assert
    // some text from one of its many states is present.
    const possibleTexts = [/pending/i, /completed/i, /past due/i, /no updates/i, /loading/i];
    const found = possibleTexts.some((re) => screen.queryByText(re));
    expect(found).toBe(true);
  });
});

describe("/community/[communityId]/karma-ai async page", () => {
  it("renders CommunityProjectEvaluatorPage", async () => {
    const { default: Page } = await import("@/app/community/[communityId]/karma-ai/page");
    const result = await Page({ params: Promise.resolve({ communityId: "c1" }) });
    render(result);
    expect(screen.getByTestId("karma-ai-evaluator")).toBeInTheDocument();
  });
});

describe("/community/[communityId]/manage/funding-platform list page", () => {
  it("renders programs stats or empty state", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/manage/funding-platform/page")
    );
    const empty = screen.queryByTestId("no-programs-empty");
    const cards = screen.queryAllByTestId("funding-platform-stats-card");
    expect(empty !== null || cards.length > 0).toBe(true);
  });
});

describe("/community/[communityId]/manage/funding-platform/[programId]/applications/[applicationId]", () => {
  it("renders the application detail client page", async () => {
    await renderClientPage(
      () =>
        import(
          "@/app/community/[communityId]/manage/funding-platform/[programId]/applications/[applicationId]/page"
        )
    );
    // Page mounts; with no application data it shows a spinner or back nav.
    const spinner = screen.queryByTestId("spinner");
    const back = screen.queryByText(/back/i);
    expect(spinner || back).not.toBeNull();
  });
});
