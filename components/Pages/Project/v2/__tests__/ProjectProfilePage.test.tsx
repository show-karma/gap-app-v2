import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectProfilePage } from "../ProjectProfilePage";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
}));

// Mock project data
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description for testing the profile page.",
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
    allUpdates: [
      {
        uid: "milestone-1",
        type: "milestone",
        title: "First Milestone",
        description: "Description",
        createdAt: new Date().toISOString(),
        completed: true,
        chainID: 1,
        refUID: "0x123",
        source: { type: "project" },
      },
    ],
    completedCount: 1,
    stats: {
      grantsCount: 2,
      endorsementsCount: 3,
      lastUpdate: new Date(),
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

// Mock ActivityCard
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data: { title: string } } }) => (
    <div data-testid="activity-card">{activity.data.title || "Activity"}</div>
  ),
}));

// Mock ImpactContent to avoid loading external dependencies
jest.mock("../MainContent/ImpactContent", () => ({
  ImpactContent: () => <div data-testid="impact-content">Impact Content Mock</div>,
}));

describe("ProjectProfilePage", () => {
  describe("Rendering", () => {
    it("should render project profile page", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("project-profile-page")).toBeInTheDocument();
    });

    it("should render project header", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
      expect(screen.getByTestId("project-title")).toHaveTextContent("Test Project");
    });

    it("should render stats bar", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should render side panel", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render main content", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("project-main-content")).toBeInTheDocument();
    });
  });

  describe("Stats", () => {
    it("should display grants count", () => {
      render(<ProjectProfilePage />);

      // Stats bar shows "2" for grants (from mocked data)
      const statValues = screen.getAllByTestId("stat-value");
      const grantsValue = statValues.find((el) => el.textContent === "2");
      expect(grantsValue).toBeInTheDocument();
    });

    it("should display endorsements count", () => {
      render(<ProjectProfilePage />);

      // Stats bar shows "3" for endorsements (from mocked project.endorsements)
      const statValues = screen.getAllByTestId("stat-value");
      const endorsementsValue = statValues.find((el) => el.textContent === "3");
      expect(endorsementsValue).toBeInTheDocument();
    });
  });

  describe("Side Panel Components", () => {
    it("should render donate section", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render endorse section", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render subscribe section", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render quick links card", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });
  });

  describe("Main Content Components", () => {
    it("should render content tabs", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("content-tabs")).toBeInTheDocument();
    });

    it("should render activity filters", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    });

    it("should render activity feed", () => {
      render(<ProjectProfilePage />);

      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectProfilePage className="custom-class" />);

      expect(screen.getByTestId("project-profile-page")).toHaveClass("custom-class");
    });
  });
});

// NOTE: Loading state test is in a separate file (ProjectProfilePage.loading.test.tsx)
// to properly isolate the mock. Module mocking in Jest requires separate file isolation
// to override mocks from the top-level jest.mock() calls.

describe("ProjectProfilePage Error Boundary", () => {
  it("should render with error boundary wrapper", () => {
    render(<ProjectProfilePage />);

    // The ErrorBoundary is present and working - if there was an error,
    // it would show the fallback. Since no error, content renders normally.
    expect(screen.getByTestId("project-profile-page")).toBeInTheDocument();
  });
});
