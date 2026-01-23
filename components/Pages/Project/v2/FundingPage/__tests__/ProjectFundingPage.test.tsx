import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectFundingPage } from "../ProjectFundingPage";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock project data
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description for testing the funding page.",
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

// Mock useProjectGrants for FundingContent
jest.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({
    grants: [
      {
        uid: "grant-1",
        chainID: 1,
        details: { title: "Test Grant 1", description: "Grant description" },
        community: {
          details: { name: "Test Community", imageURL: "https://example.com/community.png" },
        },
        completed: false,
      },
      {
        uid: "grant-2",
        chainID: 1,
        details: { title: "Test Grant 2", description: "Another grant" },
        community: {
          details: { name: "Another Community", imageURL: "https://example.com/community2.png" },
        },
        completed: { uid: "completed-1", createdAt: new Date().toISOString() },
      },
    ],
    isLoading: false,
    error: null,
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
  useOwnerStore: () => ({
    isOwner: false,
  }),
}));

jest.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: () => ({
    isProjectAdmin: false,
    isProjectOwner: false,
  }),
}));

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: () => ({
    communities: [],
  }),
}));

jest.mock("@/store/communityAdmin", () => ({
  useCommunityAdminStore: () => ({
    isCommunityAdmin: false,
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

// Mock MarkdownPreview to avoid complex rendering
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <span>{source}</span>,
}));

describe("ProjectFundingPage", () => {
  describe("Rendering", () => {
    it("should render project funding page", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("project-funding-page")).toBeInTheDocument();
    });

    it("should render project header", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
      expect(screen.getByTestId("project-title")).toHaveTextContent("Test Project");
    });

    it("should render stats bar", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should render side panel", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render funding main content", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("funding-main-content")).toBeInTheDocument();
    });

    it("should render funding tabs", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("funding-tabs")).toBeInTheDocument();
    });

    it("should render funding content", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("funding-content")).toBeInTheDocument();
    });
  });

  describe("Tabs", () => {
    it("should show funding tab as active", () => {
      render(<ProjectFundingPage />);

      const fundingTab = screen.getByTestId("tab-funding");
      expect(fundingTab).toHaveAttribute("aria-selected", "true");
    });

    it("should show all navigation tabs", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("tab-impact")).toBeInTheDocument();
    });
  });

  describe("Grants List", () => {
    it("should display grants list", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("grants-list")).toBeInTheDocument();
    });

    it("should display grant cards", () => {
      render(<ProjectFundingPage />);

      const grantCards = screen.getAllByTestId("grant-card");
      expect(grantCards).toHaveLength(2);
    });

    it("should display grant titles", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByText("Test Grant 1")).toBeInTheDocument();
      expect(screen.getByText("Test Grant 2")).toBeInTheDocument();
    });

    it("should display funding count in header", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByText("Funding (2)")).toBeInTheDocument();
    });
  });

  describe("Side Panel Components", () => {
    it("should render donate section", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render endorse section", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render subscribe section", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render quick links card", () => {
      render(<ProjectFundingPage />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectFundingPage className="custom-class" />);

      expect(screen.getByTestId("project-funding-page")).toHaveClass("custom-class");
    });
  });
});
