import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  usePathname: () => "/project/test-project-123/team",
}));

// Mock useProjectProfile to return loading state
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    project: null,
    isLoading: true,
    error: null,
    isVerified: false,
    allUpdates: [],
    completedCount: 0,
    stats: {
      grantsCount: 0,
      endorsementsCount: 0,
      lastUpdate: undefined,
      completeRate: 0,
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    isEndorsementOpen: false,
    setIsEndorsementOpen: jest.fn(),
  }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    isIntroModalOpen: false,
    setIsIntroModalOpen: jest.fn(),
  }),
}));

// Mock dialogs to avoid complex dependencies
jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

// Mock all child components to avoid ESM dependency issues
jest.mock("../Header/ProjectHeader", () => ({
  ProjectHeader: () => <div data-testid="project-header">Header</div>,
}));

jest.mock("../StatsBar/ProjectStatsBar", () => ({
  ProjectStatsBar: () => <div data-testid="project-stats-bar">Stats</div>,
}));

jest.mock("../SidePanel/ProjectSidePanel", () => ({
  ProjectSidePanel: () => <div data-testid="project-side-panel">Side Panel</div>,
}));

jest.mock("../Navigation/ProjectNavigationTabs", () => ({
  ProjectNavigationTabs: () => <div data-testid="project-navigation-tabs">Navigation Tabs</div>,
}));

jest.mock("../TeamContent/TeamContent", () => ({
  TeamContent: () => <div data-testid="team-content">Team Content</div>,
}));

// Import component after mocks are set up
import { ProjectTeamPage } from "../ProjectTeamPage";

describe("ProjectTeamPage Loading State", () => {
  it("should show loading state when project is loading", () => {
    render(<ProjectTeamPage />);

    // Loading state should display loading message
    expect(screen.getByText("Loading project...")).toBeInTheDocument();
  });

  it("should show loading indicator with correct styling", () => {
    render(<ProjectTeamPage />);

    // The loading text itself has the animate-pulse class
    const loadingText = screen.getByText("Loading project...");
    expect(loadingText).toHaveClass("animate-pulse");

    // Parent container has flex styling for centering
    const loadingContainer = loadingText.parentElement;
    expect(loadingContainer).toHaveClass("flex", "items-center", "justify-center");
  });

  it("should not render project content when loading", () => {
    render(<ProjectTeamPage />);

    // Project content should not be visible
    expect(screen.queryByTestId("project-team-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("project-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("team-content")).not.toBeInTheDocument();
  });

  it("should show loading state with correct test id", () => {
    render(<ProjectTeamPage />);

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });
});
