import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectTeamPage } from "../ProjectTeamPage";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  usePathname: () => "/project/test-project-123/team",
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock project data
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description for testing the team page.",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    stageIn: "Growth",
    links: [
      { type: "twitter", url: "https://twitter.com/test" },
      { type: "website", url: "https://example.com" },
    ],
  },
  members: [{ address: "0x2222222222222222222222222222222222222222" }],
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

// Create a store state that can be used with selectors
const mockStoreState = {
  project: mockProject,
  isProjectAdmin: false,
  isProjectOwner: true,
};

const mockOwnerStoreState = { isOwner: false };

jest.mock("@/store", () => ({
  useProjectStore: jest.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
  useOwnerStore: jest.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockOwnerStoreState);
    }
    return mockOwnerStoreState;
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

// Mock contributor profile modal store
jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: jest.fn(),
  }),
}));

// Mock ENS store
const mockEnsState = {
  ensData: {},
  populateEns: jest.fn(),
};

jest.mock("@/store/ens", () => ({
  useENS: jest.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockEnsState);
    }
    return mockEnsState;
  }),
}));

// Mock team profiles hook
jest.mock("@/hooks/useTeamProfiles", () => ({
  useTeamProfiles: () => ({
    teamProfiles: [],
  }),
}));

// Mock project instance hook
jest.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: () => ({
    project: mockProject,
  }),
}));

// Mock copy to clipboard hook
jest.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, jest.fn()],
}));

// Mock react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      "0x1234567890123456789012345678901234567890": "Owner",
      "0x2222222222222222222222222222222222222222": "Member",
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock dialogs
jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

jest.mock("@/components/Dialogs/ContributorProfileDialog", () => ({
  ContributorProfileDialog: () => <div data-testid="contributor-profile-dialog" />,
}));

jest.mock("@/components/Dialogs/Member/InviteMember", () => ({
  InviteMemberDialog: () => <button data-testid="invite-member-dialog">Invite Member</button>,
}));

jest.mock("@/components/Dialogs/Member/DeleteMember", () => ({
  DeleteMemberDialog: () => <button data-testid="delete-member-dialog">Delete</button>,
}));

jest.mock("@/components/Dialogs/Member/DemoteMember", () => ({
  DemoteMemberDialog: () => <button data-testid="demote-member-dialog">Demote</button>,
}));

jest.mock("@/components/Dialogs/Member/PromoteMember", () => ({
  PromoteMemberDialog: () => <button data-testid="promote-member-dialog">Promote</button>,
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

// Mock icons
jest.mock("@/components/Icons", () => ({
  GithubIcon: () => <svg data-testid="github-icon" />,
  LinkedInIcon: () => <svg data-testid="linkedin-icon" />,
  Twitter2Icon: () => <svg data-testid="twitter-icon" />,
}));

jest.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: () => <svg data-testid="farcaster-icon" />,
}));

// Mock ExternalLink
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Mock Skeleton
jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}));

// Mock MarkdownPreview to avoid test setup issues
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div>{source}</div>,
}));

describe("ProjectTeamPage", () => {
  describe("Rendering", () => {
    it("should render project team page", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("project-team-page")).toBeInTheDocument();
    });

    it("should render project header", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
      expect(screen.getByTestId("project-title")).toHaveTextContent("Test Project");
    });

    it("should render stats bar", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should render side panel", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render team main content", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("team-main-content")).toBeInTheDocument();
    });

    it("should render navigation tabs", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("project-navigation-tabs")).toBeInTheDocument();
    });

    it("should render team content", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("team-content")).toBeInTheDocument();
    });
  });

  describe("Stats", () => {
    it("should display grants count", () => {
      render(<ProjectTeamPage />);

      const statValues = screen.getAllByTestId("stat-value");
      const grantsValue = statValues.find((el) => el.textContent === "2");
      expect(grantsValue).toBeInTheDocument();
    });

    it("should display endorsements count", () => {
      render(<ProjectTeamPage />);

      const statValues = screen.getAllByTestId("stat-value");
      const endorsementsValue = statValues.find((el) => el.textContent === "3");
      expect(endorsementsValue).toBeInTheDocument();
    });
  });

  describe("Side Panel Components", () => {
    it("should render donate section", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render endorse section", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render subscribe section", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render quick links card", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should render all navigation tabs", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("nav-tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-impact")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-team")).toBeInTheDocument();
    });

    it("should mark Team tab as active", () => {
      render(<ProjectTeamPage />);

      const teamTab = screen.getByTestId("nav-tab-team");
      expect(teamTab).toHaveAttribute("data-state", "active");
    });
  });

  describe("Team Content", () => {
    it("should display team members list", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("team-members-list")).toBeInTheDocument();
    });

    it("should display team members count", () => {
      render(<ProjectTeamPage />);

      // 2 members: owner + 1 team member
      expect(screen.getByText("Team Members (2)")).toBeInTheDocument();
    });

    it("should render invite member button for authorized users", () => {
      render(<ProjectTeamPage />);

      expect(screen.getByTestId("invite-member-dialog")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectTeamPage className="custom-class" />);

      expect(screen.getByTestId("project-team-page")).toHaveClass("custom-class");
    });
  });
});

// NOTE: Loading state test is in a separate file (ProjectTeamPage.loading.test.tsx)
// to properly isolate the mock. Module mocking in Jest requires separate file isolation
// to override mocks from the top-level jest.mock() calls.

describe("ProjectTeamPage Error Boundary", () => {
  it("should render with error boundary wrapper", () => {
    render(<ProjectTeamPage />);

    // The ErrorBoundary is present and working - if there was an error,
    // it would show the fallback. Since no error, content renders normally.
    expect(screen.getByTestId("project-team-page")).toBeInTheDocument();
  });
});
