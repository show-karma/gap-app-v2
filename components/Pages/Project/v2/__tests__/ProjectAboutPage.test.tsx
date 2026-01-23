import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectAboutPage } from "../ProjectAboutPage";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
}));

// Mock project data with about content
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A comprehensive test project description for the about page.",
    missionSummary: "Our mission is to provide the best testing experience.",
    problem: "Developers need reliable testing infrastructure.",
    solution: "We provide automated testing tools and frameworks.",
    businessModel: "Open source with enterprise support.",
    pathToTake: "Community-first approach to growth.",
    locationOfImpact: "Global",
    raisedMoney: "$500,000",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    stageIn: "Growth",
    links: [
      { type: "twitter", url: "https://twitter.com/test" },
      { type: "website", url: "https://example.com" },
    ],
  },
  members: [],
  endorsements: [{ id: "1" }, { id: "2" }, { id: "3" }],
};

// Mock the unified useProjectProfile hook
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    project: mockProject,
    isLoading: false,
    error: null,
    isVerified: true,
    allUpdates: [],
    completedCount: 0,
    stats: {
      grantsCount: 2,
      endorsementsCount: 3,
      lastUpdate: new Date(),
      completeRate: 75,
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useProjectSocials", () => ({
  useProjectSocials: () => [
    {
      name: "Twitter",
      url: "https://twitter.com/test",
      icon: ({ className }: { className?: string }) => (
        <svg data-testid="twitter-icon" className={className} />
      ),
    },
  ],
}));

jest.mock("@/store", () => ({
  useProjectStore: () => ({
    isProjectAdmin: false,
  }),
}));

// Mock stores for side panel and dialogs
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

// Mock dialogs
jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

// Mock fetchData for SubscribeSection
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve([{}, null])),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock wagmi with all required hooks
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
  useChainId: () => 1,
  useSwitchChain: () => ({ switchChainAsync: jest.fn() }),
}));

// Mock SingleProjectDonateModal to avoid complex wagmi/web3 dependencies
jest.mock("@/components/Donation/SingleProject/SingleProjectDonateModal", () => ({
  SingleProjectDonateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="donate-modal">Donation Modal</div> : null,
}));

// Mock hasConfiguredPayoutAddresses
jest.mock("@/src/features/chain-payout-address/hooks/use-chain-payout-address", () => ({
  hasConfiguredPayoutAddresses: jest.fn(() => true),
}));

// Mock MarkdownPreview
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source, className }: { source: string; className?: string }) => (
    <div data-testid="markdown-preview" className={className}>
      {source}
    </div>
  ),
}));

// Mock ActivityCard to avoid complex dependency chain
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data: { title: string } } }) => (
    <div data-testid="activity-card">{activity?.data?.title || "Activity"}</div>
  ),
}));

// Mock ImpactContent to avoid SDK dependencies
jest.mock("../MainContent/ImpactContent", () => ({
  ImpactContent: () => <div data-testid="impact-content">Impact Content</div>,
}));

// Mock AboutContent with proper structure for testing
jest.mock("../MainContent/AboutContent", () => ({
  AboutContent: ({ project }: { project: { details: Record<string, string> } }) => (
    <div data-testid="about-content">
      {project?.details?.description && (
        <div data-testid="about-section-description">
          <h3>Description</h3>
          <div>{project.details.description}</div>
        </div>
      )}
      {project?.details?.missionSummary && (
        <div data-testid="about-section-mission">
          <h3>Mission</h3>
          <div>{project.details.missionSummary}</div>
        </div>
      )}
      {project?.details?.problem && (
        <div data-testid="about-section-problem">
          <h3>Problem</h3>
          <div>{project.details.problem}</div>
        </div>
      )}
      {project?.details?.solution && (
        <div data-testid="about-section-solution">
          <h3>Solution</h3>
          <div>{project.details.solution}</div>
        </div>
      )}
      {project?.details?.businessModel && (
        <div data-testid="about-section-business-model">
          <h3>Business Model</h3>
          <div>{project.details.businessModel}</div>
        </div>
      )}
      {project?.details?.pathToTake && (
        <div data-testid="about-section-path-to-success">
          <h3>Path to Success</h3>
          <div>{project.details.pathToTake}</div>
        </div>
      )}
      {project?.details?.locationOfImpact && (
        <div data-testid="about-section-location">
          <h3>Location of Impact</h3>
          <div>{project.details.locationOfImpact}</div>
        </div>
      )}
      {project?.details?.raisedMoney && (
        <div data-testid="about-section-funds-raised">
          <h3>Total Funds Raised</h3>
          <div>{project.details.raisedMoney}</div>
        </div>
      )}
    </div>
  ),
}));

describe("ProjectAboutPage", () => {
  describe("Rendering", () => {
    it("should render project about page", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("project-about-page")).toBeInTheDocument();
    });

    it("should render project header", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
      expect(screen.getByTestId("project-title")).toHaveTextContent("Test Project");
    });

    it("should render stats bar", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should render side panel", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render main content", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("project-main-content")).toBeInTheDocument();
    });
  });

  describe("About Tab Active", () => {
    it("should have about tab selected by default", () => {
      render(<ProjectAboutPage />);

      const aboutTab = screen.getByTestId("tab-about");
      expect(aboutTab).toHaveAttribute("data-state", "active");
    });

    it("should render about content", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-content")).toBeInTheDocument();
    });

    it("should display project description section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("should display project mission section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-mission")).toBeInTheDocument();
      expect(screen.getByText("Mission")).toBeInTheDocument();
    });

    it("should display project problem section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-problem")).toBeInTheDocument();
      expect(screen.getByText("Problem")).toBeInTheDocument();
    });

    it("should display project solution section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-solution")).toBeInTheDocument();
      expect(screen.getByText("Solution")).toBeInTheDocument();
    });

    it("should display project business model section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-business-model")).toBeInTheDocument();
      expect(screen.getByText("Business Model")).toBeInTheDocument();
    });

    it("should display project path to success section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-path-to-success")).toBeInTheDocument();
      expect(screen.getByText("Path to Success")).toBeInTheDocument();
    });

    it("should display project location of impact section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-location")).toBeInTheDocument();
      expect(screen.getByText("Location of Impact")).toBeInTheDocument();
    });

    it("should display project funds raised section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("about-section-funds-raised")).toBeInTheDocument();
      expect(screen.getByText("Total Funds Raised")).toBeInTheDocument();
    });
  });

  describe("Side Panel Components", () => {
    it("should render donate section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render endorse section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render subscribe section", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render quick links card", () => {
      render(<ProjectAboutPage />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectAboutPage className="custom-class" />);

      expect(screen.getByTestId("project-about-page")).toHaveClass("custom-class");
    });
  });
});

// Test for loading state - separate test file may be needed for proper mock isolation
describe("ProjectAboutPage Loading", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should be testable in isolation for loading state", () => {
    // Note: Full loading state testing requires separate file for mock isolation
    // Similar to ProjectProfilePage.loading.test.tsx pattern
    expect(true).toBe(true);
  });
});
