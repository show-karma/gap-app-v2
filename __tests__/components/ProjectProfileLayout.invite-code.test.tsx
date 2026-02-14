/**
 * @file Tests for invite-code detection in ProjectProfileLayout
 * @description Verifies that the invite-code URL parameter triggers the contributor
 * profile modal exactly once, and does not re-open after the user closes it.
 */

import { render } from "@testing-library/react";

// Track invite-code mock state
let mockInviteCode: string | null = null;
let mockOpenContributorProfileModal: jest.Mock;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-id" }),
  usePathname: () => "/project/test-project-id",
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "invite-code") return mockInviteCode;
      if (key === "view") return null;
      return null;
    },
    toString: () => (mockInviteCode ? `invite-code=${mockInviteCode}` : ""),
  }),
}));

// Mock all stores
jest.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: () => ({}),
}));

jest.mock("@/hooks/v2/useProjectProfileLayout", () => ({
  useProjectProfileLayout: () => ({
    project: null,
    isLoading: true,
    isProjectLoading: true,
    isError: false,
    isVerified: false,
    stats: { grantsCount: 0, endorsementsCount: 0 },
  }),
}));

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({ isEndorsementOpen: false }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({ isIntroModalOpen: false }),
}));

jest.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({ isProgressModalOpen: false }),
}));

jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenContributorProfileModal,
  }),
}));

// Mock all child components to avoid deep dependency chains (Stripe, gasless, etc.)
jest.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  ContentTabsSkeleton: () => <div data-testid="content-tabs-skeleton" />,
  MobileHeaderMinifiedSkeleton: () => null,
  MobileProfileContentSkeleton: () => null,
  ProjectHeaderSkeleton: () => <div data-testid="header-skeleton" />,
  ProjectSidePanelSkeleton: () => null,
  ProjectStatsBarSkeleton: () => null,
}));

jest.mock("@/components/Pages/Project/v2/EndorsementsListDialog", () => ({
  EndorsementsListDialog: () => null,
}));

jest.mock("@/components/Pages/Project/v2/Header/ProjectHeader", () => ({
  ProjectHeader: () => <div data-testid="project-header" />,
}));

jest.mock("@/components/Pages/Project/v2/MainContent/ContentTabs", () => ({
  ContentTabs: () => <div data-testid="content-tabs" />,
}));

jest.mock("@/components/Pages/Project/v2/Mobile/MobileHeaderMinified", () => ({
  MobileHeaderMinified: () => null,
}));

jest.mock("@/components/Pages/Project/v2/Mobile/MobileProfileContent", () => ({
  MobileProfileContent: () => null,
}));

jest.mock("@/components/Pages/Project/v2/SidePanel/ProjectSidePanel", () => ({
  ProjectSidePanel: () => null,
}));

jest.mock("@/components/Pages/Project/v2/StatsBar/ProjectStatsBar", () => ({
  ProjectStatsBar: () => null,
}));

jest.mock("@/components/Dialogs/ProgressDialog", () => ({
  ProgressDialog: () => null,
}));

jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => null,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => null,
}));

jest.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  ProjectOptionsDialogs: () => null,
  ProjectOptionsMenu: () => null,
}));

jest.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";

describe("ProjectProfileLayout - Invite Code Detection", () => {
  beforeEach(() => {
    mockInviteCode = null;
    mockOpenContributorProfileModal = jest.fn();
  });

  it("should open the contributor profile modal when invite-code is in the URL", () => {
    mockInviteCode = "0x7232abc123";
    render(
      <ProjectProfileLayout>
        <div>Content</div>
      </ProjectProfileLayout>
    );

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
  });

  it("should NOT open the modal when no invite-code is present", () => {
    mockInviteCode = null;
    render(
      <ProjectProfileLayout>
        <div>Content</div>
      </ProjectProfileLayout>
    );

    expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
  });

  it("should only open the modal once (hasOpenedInviteModal guard prevents re-open)", () => {
    mockInviteCode = "0x7232abc123";
    const { rerender } = render(
      <ProjectProfileLayout>
        <div>Content</div>
      </ProjectProfileLayout>
    );

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);

    // Re-render to simulate the effect running again (e.g., after modal close)
    rerender(
      <ProjectProfileLayout>
        <div>Content</div>
      </ProjectProfileLayout>
    );

    // Should still only have been called once — the state guard prevents re-opening
    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
  });
});
