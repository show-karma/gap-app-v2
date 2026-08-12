/**
 * "View changes" navigation from the Comments tab. The version diff lives in the
 * Application tab, so the click has to switch tabs — without that it updated
 * `applicationViewMode` on a panel Radix had unmounted and looked like a dead
 * button. The scroll is handed to the tab that owns the anchor instead of a
 * setTimeout that fired before the element existed.
 */

import { act } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";

const mockSelectVersion = vi.fn();

const versions = [
  { id: "v2", versionNumber: 1, createdAt: "2026-01-02T10:00:00.000Z" },
  { id: "v1", versionNumber: 0, createdAt: "2026-01-01T10:00:00.000Z" },
];

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === "tab" ? "comments" : null) }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "0xreviewer" }),
}));

vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => vi.fn(),
}));

vi.mock("@/hooks/useFundingPlatform", () => ({
  useApplication: () => ({
    application: { id: "app-1", referenceNumber: "APP-001", status: "under_review" },
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({ data: undefined }),
  }),
  useApplicationComments: () => ({
    comments: [],
    isLoading: false,
    createCommentAsync: vi.fn(),
    editCommentAsync: vi.fn(),
    deleteCommentAsync: vi.fn(),
    refetch: vi.fn(),
  }),
  useApplicationStatus: () => ({ updateStatusAsync: vi.fn(), isUpdating: false }),
  useApplicationVersions: () => ({ versions, refetch: vi.fn() }),
  useDeleteApplication: () => ({ deleteApplicationAsync: vi.fn(), isDeleting: false }),
  useProgramConfig: () => ({ data: undefined, config: undefined }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycStatus: () => ({ status: undefined }),
  useKycConfig: () => ({ isEnabled: false }),
}));

vi.mock("@/src/core/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/src/core/rbac")>("@/src/core/rbac");
  return {
    ...actual,
    useIsFundingPlatformAdmin: () => true,
    useIsFundingPlatformReviewer: () => false,
  };
});

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({ isLoading: false, can: () => true }),
}));

vi.mock("@/src/features/applications/hooks/use-milestones-admin-refetch", () => ({
  useMilestonesAdminRefetch: () => undefined,
}));

vi.mock("@/store/applicationVersions", () => ({
  useApplicationVersionsStore: () => ({ selectVersion: mockSelectVersion }),
}));

import { useApplicationDetailView } from "@/components/FundingPlatform/ApplicationView/useApplicationDetailView";
import {
  ACTIVITY_TIMELINE_ANCHOR_ID,
  APPLICATION_DETAILS_ANCHOR_ID,
} from "@/components/FundingPlatform/ApplicationView/usePendingScroll";

const renderDetailView = () =>
  renderHookWithProviders(() =>
    useApplicationDetailView({
      applicationId: "APP-001",
      programId: "prog-1",
      combinedProgramId: "prog-1_42161",
      communityId: "octant",
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useApplicationDetailView version navigation", () => {
  it("should_start_on_the_comments_tab_from_the_tab_query_param", () => {
    const { result } = renderDetailView();

    expect(result.current.activeTabId).toBe("comments");
    expect(result.current.versionViewSourceTab).toBeNull();
  });

  it("should_select_the_version_and_switch_to_the_application_tab_in_changes_mode", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleVersionClick("v2"));

    expect(mockSelectVersion).toHaveBeenCalledWith("v2", versions);
    expect(result.current.applicationViewMode).toBe("changes");
    expect(result.current.activeTabId).toBe("application");
  });

  it("should_record_the_source_tab_and_queue_the_details_scroll", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleVersionClick("v2"));

    expect(result.current.versionViewSourceTab).toBe("comments");
    expect(result.current.pendingScrollAnchorId).toBe(APPLICATION_DETAILS_ANCHOR_ID);
  });

  it("should_clear_the_pending_scroll_once_the_owning_tab_reports_it_handled", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleVersionClick("v2"));
    act(() => result.current.handlePendingScrollHandled());

    expect(result.current.pendingScrollAnchorId).toBeNull();
    // The way back must survive the scroll being consumed.
    expect(result.current.versionViewSourceTab).toBe("comments");
  });

  it("should_return_to_the_source_tab_and_clear_the_flag_when_going_back", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleVersionClick("v2"));
    act(() => result.current.handleBackToVersionSource());

    expect(result.current.activeTabId).toBe("comments");
    expect(result.current.versionViewSourceTab).toBeNull();
    expect(result.current.pendingScrollAnchorId).toBe(ACTIVITY_TIMELINE_ANCHOR_ID);
  });

  it("should_clear_the_source_flag_when_the_user_changes_tabs_themselves", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleVersionClick("v2"));
    act(() => result.current.handleUserTabChange("ai-analysis"));

    expect(result.current.activeTabId).toBe("ai-analysis");
    expect(result.current.versionViewSourceTab).toBeNull();
    expect(result.current.pendingScrollAnchorId).toBeNull();
  });

  it("should_keep_the_source_flag_when_the_user_lands_back_on_application_via_the_tab_bar", () => {
    const { result } = renderDetailView();

    act(() => result.current.handleUserTabChange("application"));
    act(() => result.current.handleVersionClick("v2"));

    // A programmatic switch must not be swallowed by the user-change clear path.
    expect(result.current.versionViewSourceTab).toBe("application");
  });
});
