import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { ProjectImpactPage } from "../ProjectImpactPage";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-id" }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the useProjectProfile hook
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: jest.fn(),
}));

// Mock stores
jest.mock("@/store", () => ({
  useProjectStore: jest.fn(() => ({ isProjectAdmin: false })),
  useOwnerStore: jest.fn((selector) => {
    const state = { isOwner: false };
    return selector ? selector(state as never) : state;
  }),
}));

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: jest.fn(() => ({ isEndorsementOpen: false })),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: jest.fn(() => ({ isIntroModalOpen: false })),
}));

// Mock components
jest.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

jest.mock("../Header/ProjectHeader", () => ({
  ProjectHeader: ({ project }: { project: Project }) => (
    <div data-testid="project-header">{project?.details?.title}</div>
  ),
}));

jest.mock("../StatsBar/ProjectStatsBar", () => ({
  ProjectStatsBar: () => <div data-testid="project-stats-bar">Stats Bar</div>,
}));

jest.mock("../SidePanel/ProjectSidePanel", () => ({
  ProjectSidePanel: () => <div data-testid="project-side-panel">Side Panel</div>,
}));

jest.mock("../MainContent/ProjectMainContent", () => ({
  ProjectMainContent: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="project-main-content" data-initial-tab={initialTab}>
      Main Content
    </div>
  ),
}));

import { useProjectProfile } from "@/hooks/v2/useProjectProfile";

const mockUseProjectProfile = useProjectProfile as jest.MockedFunction<typeof useProjectProfile>;

const mockProject: Project = {
  uid: "test-uid",
  chainID: 1,
  details: {
    title: "Test Project",
    description: "Test Description",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    links: {},
    stageIn: "Growth",
  },
  members: [],
  grants: [],
};

const mockProfileData = {
  project: mockProject,
  isLoading: false,
  error: null,
  isVerified: true,
  allUpdates: [],
  completedCount: 5,
  stats: {
    grantsCount: 3,
    endorsementsCount: 10,
    lastUpdate: new Date().toISOString(),
    completeRate: 80,
  },
  refetch: jest.fn(),
};

describe("ProjectImpactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectProfile.mockReturnValue(mockProfileData as never);
  });

  describe("Rendering", () => {
    it("should render the impact page", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("project-impact-page")).toBeInTheDocument();
    });

    it("should render ProjectHeader", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
    });

    it("should render ProjectStatsBar", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render ProjectSidePanel", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render ProjectMainContent", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("project-main-content")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      render(<ProjectImpactPage />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });

  describe("Initial Tab", () => {
    it("should pass initialTab=impact to ProjectMainContent", () => {
      render(<ProjectImpactPage />);

      const mainContent = screen.getByTestId("project-main-content");
      expect(mainContent).toHaveAttribute("data-initial-tab", "impact");
    });
  });

  describe("Loading State", () => {
    it("should show loading state when isLoading is true", () => {
      mockUseProjectProfile.mockReturnValue({
        ...mockProfileData,
        isLoading: true,
      } as never);

      render(<ProjectImpactPage />);

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.queryByTestId("project-impact-page")).not.toBeInTheDocument();
    });

    it("should show loading state when project is null", () => {
      mockUseProjectProfile.mockReturnValue({
        ...mockProfileData,
        project: null,
      } as never);

      render(<ProjectImpactPage />);

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectImpactPage className="custom-class" />);

      expect(screen.getByTestId("project-impact-page")).toHaveClass("custom-class");
    });
  });
});
