/**
 * @file Tests for invite-code detection in ProjectProfileLayout
 * @description Verifies that the invite-code URL parameter triggers the contributor
 * profile modal exactly once, and does not re-open after the user closes it.
 */

import { render } from "@testing-library/react";

// Track invite-code mock state
let mockInviteCode: string | null = null;
let mockOpenContributorProfileModal: vi.Mock;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-id" }),
  usePathname: () => "/project/test-project-id",
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
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

// Mock next/dynamic — needed because dialogs are now dynamically imported
jest.mock("next/dynamic", () => {
  const mockDynamic = (loader: () => Promise<any>, _options?: { ssr?: boolean }) => {
    const DynamicComponent = () => null;
    DynamicComponent.displayName = "DynamicMock";
    return DynamicComponent;
  };
  mockDynamic.default = mockDynamic;
  return mockDynamic;
});

// Mock all stores
vi.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: () => ({}),
}));

vi.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    project: null,
    isLoading: true,
    isError: false,
    isVerified: false,
    stats: { grantsCount: 0, endorsementsCount: 0, lastUpdate: null },
  }),
}));

vi.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({ isEndorsementOpen: false }),
}));

vi.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({ isIntroModalOpen: false }),
}));

vi.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({ isProgressModalOpen: false }),
}));

<<<<<<< HEAD
jest.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: () => ({ isOpen: false }),
}));

jest.mock("@/store/modals/contributorProfile", () => ({
=======
vi.mock("@/store/modals/contributorProfile", () => ({
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
  useContributorProfileModalStore: () => ({
    openModal: mockOpenContributorProfileModal,
  }),
}));

// Mock all child components to avoid deep dependency chains (Stripe, gasless, etc.)
vi.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  ContentTabsSkeleton: () => <div data-testid="content-tabs-skeleton" />,
  MobileHeaderMinifiedSkeleton: () => null,
  MobileProfileContentSkeleton: () => null,
  ProjectHeaderSkeleton: () => <div data-testid="header-skeleton" />,
  ProjectSidePanelSkeleton: () => null,
  ProjectStatsBarSkeleton: () => null,
}));

vi.mock("@/components/Pages/Project/v2/EndorsementsListDialog", () => ({
  EndorsementsListDialog: () => null,
}));

vi.mock("@/components/Pages/Project/v2/Header/ProjectHeader", () => ({
  ProjectHeader: () => <div data-testid="project-header" />,
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ContentTabs", () => ({
  ContentTabs: () => <div data-testid="content-tabs" />,
}));

vi.mock("@/components/Pages/Project/v2/Mobile/MobileHeaderMinified", () => ({
  MobileHeaderMinified: () => null,
}));

vi.mock("@/components/Pages/Project/v2/Mobile/MobileProfileContent", () => ({
  MobileProfileContent: () => null,
}));

<<<<<<< HEAD
jest.mock("@/components/Pages/Project/v2/Mobile/MobileSupportContent", () => ({
  MobileSupportContent: () => null,
}));

jest.mock("@/components/Pages/Project/v2/SidePanel/ProjectSidePanel", () => ({
  ProjectSidePanel: () => null,
}));

jest.mock("@/components/Pages/Project/v2/SidePanel/SidebarProfileCard", () => ({
  SidebarProfileCard: () => null,
}));

jest.mock("@/components/Pages/Project/v2/StatsBar/ProjectStatsBar", () => ({
=======
vi.mock("@/components/Pages/Project/v2/SidePanel/ProjectSidePanel", () => ({
  ProjectSidePanel: () => null,
}));

vi.mock("@/components/Pages/Project/v2/StatsBar/ProjectStatsBar", () => ({
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
  ProjectStatsBar: () => null,
}));

vi.mock("@/components/Dialogs/ProgressDialog", () => ({
  ProgressDialog: () => null,
}));

vi.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => null,
}));

vi.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => null,
}));

vi.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  ProjectOptionsDialogs: () => null,
  ProjectOptionsMenu: () => null,
}));

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...a: string[]) => a.filter(Boolean).join(" "),
}));

import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";

describe("ProjectProfileLayout - Invite Code Detection", () => {
  beforeEach(() => {
    mockInviteCode = null;
    mockOpenContributorProfileModal = vi.fn();
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
