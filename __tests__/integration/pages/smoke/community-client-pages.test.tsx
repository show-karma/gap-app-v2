import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";

/**
 * Smoke tests for client-side community pages — those that "use client",
 * read params via useParams, and call hooks directly. We mock the data
 * hooks and the inner heavy components, then render the page in a
 * QueryClientProvider.
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
    useParams: () => ({ communityId: "c1", programId: "p1", projectId: "proj1" }),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/community/c1",
  };
});

// Inner-component mocks
vi.mock(
  "@/app/community/[communityId]/(with-header)/browse-applications/BrowseApplicationsClient",
  () => ({
    BrowseApplicationsClient: () => (
      <div data-testid="browse-applications-client">BrowseApplications</div>
    ),
  })
);

vi.mock("@/features/programs/components/program-list", () => ({
  ProgramList: () => <div data-testid="program-list">ProgramList</div>,
}));

vi.mock("@/features/programs/components/program-filters", () => ({
  ProgramFilters: () => <div data-testid="program-filters">ProgramFilters</div>,
}));

vi.mock("@/features/programs/hooks/use-programs", () => ({
  usePrograms: () => ({
    programs: [],
    loading: false,
    error: null,
    filters: {},
    setFilters: vi.fn(),
    totalCount: 0,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/Pages/Admin/ProgramScoresUpload", () => ({
  ProgramScoresUpload: () => <div data-testid="program-scores-upload">ProgramScores</div>,
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: () => ({ hasAccess: true, isLoading: false }),
}));

vi.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: () => ({
    data: { uid: "c1", details: { name: "Test" } },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePrograms", () => ({
  useCommunityPrograms: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("@/components/Pages/Admin/MilestonesReview", () => ({
  MilestonesReviewPage: () => <div data-testid="milestones-review-page">MilestonesReview</div>,
}));

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

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner">Spinner</div>,
}));

vi.mock("@/components/QuestionBuilder", () => ({
  QuestionBuilder: () => <div data-testid="question-builder">QuestionBuilder</div>,
}));

vi.mock("@/components/FundingPlatform/SetupWizard", () => ({
  SetupWizard: () => <div data-testid="setup-wizard">SetupWizard</div>,
}));

vi.mock("@/components/ErrorBoundary/FormBuilderErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useFundingPlatform", () => ({
  useFundingPrograms: () => ({
    programs: [{ programId: "p1", chainID: 1, metadata: { title: "Program" } }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useApplication: () => ({ data: null, isLoading: false }),
  useApplicationStatus: () => ({ status: "pending" }),
  useFundingApplications: () => ({ data: [], isLoading: false }),
  useProgramConfig: () => ({ data: null, isLoading: false }),
  useApplicationComments: () => ({ data: [], isLoading: false }),
  useApplicationVersions: () => ({ data: [], isLoading: false }),
  useDeleteApplication: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useProgramSetupProgress", () => ({
  useProgramSetupProgress: () => ({ stepsCompleted: 0, totalSteps: 5 }),
}));

vi.mock("@/hooks/useProgramReviewers", () => ({
  useProgramReviewers: () => ({ reviewers: [], isLoading: false }),
}));

vi.mock("@/hooks/useQuestionBuilder", () => ({
  usePostApprovalSchema: () => ({ schema: null, isLoading: false }),
  useQuestionBuilderSchema: () => ({ schema: null, isLoading: false }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: () => ({ data: null, isLoading: false }),
  useKycStatus: () => ({ status: null, isLoading: false }),
}));

vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => ({ goBack: vi.fn(), backHref: "/" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, user: null }),
}));

vi.mock("@/components/FundingPlatform", () => ({
  ApplicationListWithAPI: () => <div data-testid="application-list-with-api">Apps</div>,
}));

vi.mock("@/components/FundingPlatform/CreateProgramModal", () => ({
  CreateProgramModal: () => null,
}));

vi.mock("@/components/FundingPlatform/Dashboard/card", () => ({
  FundingPlatformStatsCard: () => <div data-testid="funding-platform-stats-card">Stats</div>,
}));

vi.mock("@/components/FundingPlatform/NoProgramsEmptyState", () => ({
  NoProgramsEmptyState: () => <div data-testid="no-programs-empty">Empty</div>,
}));

vi.mock("@/components/FundingPlatform/ProgramSetupStatus", () => ({
  ProgramSetupStatus: () => null,
  hasFormConfigured: () => true,
}));

vi.mock("@/services/fundingPlatformService", () => ({
  fundingPlatformService: {},
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source ?? ""}</div>
  ),
}));

vi.mock("@/components/Utilities/LoadingOverlay", () => ({
  LoadingOverlay: () => null,
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="application-header">ApplicationHeader</div>,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab", () => ({
  ApplicationTab: () => <div data-testid="application-tab">ApplicationTab</div>,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTabs", () => ({
  ApplicationTabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabIcons: {},
}));

vi.mock("@/components/FundingPlatform/ApplicationView/AIAnalysisTab", () => ({
  AIAnalysisTab: () => null,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/DiscussionTab", () => ({
  DiscussionTab: () => null,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/TabPanel", () => ({
  TabPanel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("./SendEmailComposer", () => ({
  SendEmailComposer: () => <div data-testid="send-email-composer">SendEmail</div>,
}));

const renderClientPage = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const { default: Page } = await importer();
  return render(<Page />, { wrapper: Wrapper });
};

describe("Community client pages", () => {
  it("/(with-header)/browse-applications renders client", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/(with-header)/browse-applications/page")
    );
    expect(screen.getByTestId("browse-applications-client")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /browse applications/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("/(with-header)/funding-opportunities renders ProgramList", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/(with-header)/funding-opportunities/page")
    );
    expect(screen.getByTestId("program-list")).toBeInTheDocument();
    expect(screen.getByTestId("program-filters")).toBeInTheDocument();
  });

  it("/manage/program-scores renders ProgramScoresUpload", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/manage/program-scores/page")
    );
    expect(screen.getByTestId("program-scores-upload")).toBeInTheDocument();
  });

  it("/manage/funding-platform/[programId]/milestones/[projectId] renders review", async () => {
    await renderClientPage(
      () =>
        import(
          "@/app/community/[communityId]/manage/funding-platform/[programId]/milestones/[projectId]/page"
        )
    );
    expect(screen.getByTestId("milestones-review-page")).toBeInTheDocument();
  });

  it("/manage/funding-platform/[programId]/setup renders SetupWizard", async () => {
    await renderClientPage(
      () => import("@/app/community/[communityId]/manage/funding-platform/[programId]/setup/page")
    );
    expect(screen.getByTestId("setup-wizard")).toBeInTheDocument();
  });

  it("/manage/funding-platform/[programId]/question-builder renders QuestionBuilder", async () => {
    await renderClientPage(
      () =>
        import(
          "@/app/community/[communityId]/manage/funding-platform/[programId]/question-builder/page"
        )
    );
    expect(screen.getByTestId("question-builder")).toBeInTheDocument();
  });

  it("/manage/funding-platform/[programId]/applications renders ApplicationListWithAPI", async () => {
    await renderClientPage(
      () =>
        import(
          "@/app/community/[communityId]/manage/funding-platform/[programId]/applications/page"
        )
    );
    expect(screen.getByTestId("application-list-with-api")).toBeInTheDocument();
  });

  it("/manage/send-email renders client section", async () => {
    await renderClientPage(() => import("@/app/community/[communityId]/manage/send-email/page"));
    // SendEmail page either renders the composer or an empty/error state — at
    // minimum the heading must mount.
    expect(screen.getByRole("heading", { name: /send email/i })).toBeInTheDocument();
  });
});
