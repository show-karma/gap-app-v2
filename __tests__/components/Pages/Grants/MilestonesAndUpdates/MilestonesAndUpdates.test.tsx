/**
 * @file Placement tests for the grant comments surface on the
 * milestones-and-updates page.
 *
 * The load-bearing case: a reviewer writes "add your milestones before we can
 * disburse" on an approved application. The grantee has zero milestones and
 * zero updates, so the page renders `EmptyMilestone` — the comment must still
 * be visible, otherwise the feature reintroduces the exact failure it exists
 * to fix. That means the panel lives OUTSIDE the `hasMilestonesOrUpdates`
 * ternary.
 */
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import MilestonesAndUpdates from "@/components/Pages/Grants/MilestonesAndUpdates";
import type { Grant } from "@/types/v2/grant";
import { MESSAGES } from "@/utilities/messages";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const Lazy = React.lazy(() =>
      loader().then((mod) => {
        const component =
          typeof mod === "function"
            ? mod
            : ((mod as Record<string, unknown>).default ??
              Object.values(mod as Record<string, unknown>)[0]);
        return { default: component as React.ComponentType };
      })
    );
    const Wrapper = (props: Record<string, unknown>) =>
      React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
    Wrapper.displayName = "DynamicMock";
    return Wrapper;
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "my-project" }),
}));

vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestonesList",
  () => ({
    MilestonesList: () => <div data-testid="milestones-list" />,
  })
);

const mockGrant = vi.fn();
const mockLinkedActivities = vi.fn();

vi.mock("@/store/grant", () => ({
  useGrantStore: (selector: (state: { grant?: Grant }) => unknown) =>
    selector({ grant: mockGrant() }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (
    selector: (state: {
      project?: { uid: string };
      isProjectOwner: boolean;
      isProjectAdmin: boolean;
    }) => unknown
  ) => selector({ project: { uid: "0xproject" }, isProjectOwner: false, isProjectAdmin: false }),
  useOwnerStore: (selector: (state: { isOwner: boolean; isOwnerLoading: boolean }) => unknown) =>
    selector({ isOwner: false, isOwnerLoading: false }),
}));

vi.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({ openProgressModalWithScreen: vi.fn() }),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: () => ({ isCommunityAdmin: false, isResolving: false }),
}));

vi.mock("@/hooks/useTracks", () => ({
  useTracksForProgram: () => ({ data: [] }),
}));

vi.mock("@/hooks/v2/useGrantLinkedActivities", () => ({
  useGrantLinkedActivities: () => mockLinkedActivities(),
}));

// --- GrantCommentsPanel's own dependencies (the panel itself is real) ---

const mockUseProjectAuthorization = vi.fn();

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => mockUseProjectAuthorization(),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="permission-provider">{children}</div>
  ),
}));

vi.mock("@/components/Pages/Grants/MilestonesAndUpdates/GrantCommentsSection", () => ({
  GrantCommentsSection: () => <div data-testid="grant-comments-section" />,
}));

const GRANT_WITHOUT_MILESTONES: Grant = {
  uid: "0xgrant",
  chainID: 42161,
  projectUID: "0xproject",
  communityUID: "0xcommunity",
  programId: "1013_42161",
  referenceNumber: "APP-00012-00003",
  details: { title: "ProPGF Batch 2" },
  milestones: [],
  updates: [],
};

describe("MilestonesAndUpdates comments placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrant.mockReturnValue(GRANT_WITHOUT_MILESTONES);
    mockLinkedActivities.mockReturnValue([]);
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });
  });

  it("renders the comments section for a grant with no milestones and no updates", async () => {
    render(<MilestonesAndUpdates />);

    await waitFor(() => expect(screen.getByTestId("grant-comments-section")).toBeInTheDocument());
  });

  it("still renders the empty-milestone state alongside the comments", async () => {
    render(<MilestonesAndUpdates />);

    await waitFor(() => expect(screen.getByTestId("grant-comments-section")).toBeInTheDocument());
    expect(screen.queryByTestId("milestones-list")).not.toBeInTheDocument();
    expect(screen.getByText(MESSAGES.PROJECT.EMPTY.GRANTS.UPDATES)).toBeInTheDocument();
  });

  it("renders the comments section for a grant that does have milestones", async () => {
    mockGrant.mockReturnValue({
      ...GRANT_WITHOUT_MILESTONES,
      milestones: [{ uid: "0xm1", chainID: 42161, title: "M1", verified: [] }],
    } as Grant);

    render(<MilestonesAndUpdates />);

    await waitFor(() => expect(screen.getByTestId("milestones-list")).toBeInTheDocument());
    expect(screen.getByTestId("grant-comments-section")).toBeInTheDocument();
  });

  it("leaves the empty state untouched when the grant has no linked application", () => {
    mockGrant.mockReturnValue({ ...GRANT_WITHOUT_MILESTONES, referenceNumber: null } as Grant);

    render(<MilestonesAndUpdates />);

    expect(screen.queryByTestId("grant-comments-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("permission-provider")).not.toBeInTheDocument();
    expect(screen.getByText(MESSAGES.PROJECT.EMPTY.GRANTS.UPDATES)).toBeInTheDocument();
  });

  it("renders nothing extra when there is no grant at all", () => {
    mockGrant.mockReturnValue(undefined);

    render(<MilestonesAndUpdates />);

    expect(screen.queryByTestId("grant-comments-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("permission-provider")).not.toBeInTheDocument();
  });
});
