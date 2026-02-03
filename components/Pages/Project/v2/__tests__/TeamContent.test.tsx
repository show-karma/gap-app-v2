import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TeamContent } from "../TeamContent/TeamContent";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

// Mock project store
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  owner: "0x1111111111111111111111111111111111111111" as `0x${string}`,
  details: {
    title: "Test Project",
    slug: "test-project",
  },
  members: [
    { address: "0x2222222222222222222222222222222222222222" },
    { address: "0x3333333333333333333333333333333333333333" },
  ],
};

// Create store state for use with selectors
const mockStoreState = {
  project: mockProject,
  isProjectOwner: true,
  isProjectAdmin: false,
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

// Mock contributor profile modal store
jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: jest.fn(),
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
      "0x1111111111111111111111111111111111111111": "Owner",
      "0x2222222222222222222222222222222222222222": "Admin",
      "0x3333333333333333333333333333333333333333": "Member",
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock dialog components
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

describe("TeamContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the team content container", () => {
      render(<TeamContent />);

      expect(screen.getByTestId("team-content")).toBeInTheDocument();
    });

    it("should display team members count in heading", () => {
      render(<TeamContent />);

      // 3 members: owner + 2 team members
      expect(screen.getByText("Team Members (3)")).toBeInTheDocument();
    });

    it("should render team members list", () => {
      render(<TeamContent />);

      expect(screen.getByTestId("team-members-list")).toBeInTheDocument();
    });

    it("should render all team member cards", () => {
      render(<TeamContent />);

      const memberCards = screen.getAllByTestId("team-member-card");
      expect(memberCards).toHaveLength(3);
    });

    it("should render contributor profile dialog", () => {
      render(<TeamContent />);

      expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();
    });
  });

  describe("Authorization", () => {
    it("should show invite member dialog for authorized users", () => {
      render(<TeamContent />);

      expect(screen.getByTestId("invite-member-dialog")).toBeInTheDocument();
    });
  });

  describe("Member Sorting", () => {
    it("should sort members by role (Owner > Admin > Member)", () => {
      render(<TeamContent />);

      const memberCards = screen.getAllByTestId("team-member-card");
      const addresses = memberCards.map(
        (card) => card.querySelector('[data-testid="member-address"]')?.textContent
      );

      // Owner should be first, then Admin, then Member
      expect(addresses[0]).toBe("0x1111111111111111111111111111111111111111");
      expect(addresses[1]).toBe("0x2222222222222222222222222222222222222222");
      expect(addresses[2]).toBe("0x3333333333333333333333333333333333333333");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<TeamContent className="custom-class" />);

      expect(screen.getByTestId("team-content")).toHaveClass("custom-class");
    });
  });
});

describe("TeamContent - Empty State", () => {
  beforeEach(() => {
    // Override mock for empty project
    const { useProjectStore, useOwnerStore } = jest.requireMock("@/store");
    useProjectStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      const state = {
        project: null,
        isProjectOwner: false,
        isProjectAdmin: false,
      };
      if (typeof selector === "function") {
        return selector(state);
      }
      return state;
    });
    useOwnerStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      const state = { isOwner: false };
      if (typeof selector === "function") {
        return selector(state);
      }
      return state;
    });
  });

  it("should show empty state when no members", () => {
    render(<TeamContent />);

    expect(screen.getByText("No team members found")).toBeInTheDocument();
  });

  it("should display zero members count", () => {
    render(<TeamContent />);

    expect(screen.getByText("Team Members (0)")).toBeInTheDocument();
  });
});
