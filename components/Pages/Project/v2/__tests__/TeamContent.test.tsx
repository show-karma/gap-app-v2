import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useOwnerStore, useProjectStore } from "@/store";
import { TeamContent } from "../TeamContent/TeamContent";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/project/test-project-123",
}));

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: false,
    isLoading: false,
  }),
}));

// Mock usePermissionsQuery
vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
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

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
  useOwnerStore: vi.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockOwnerStoreState);
    }
    return mockOwnerStoreState;
  }),
}));

// Mock ENS store
const mockEnsState = {
  ensData: {},
  populateEns: vi.fn(),
};

vi.mock("@/store/ens", () => ({
  useENS: vi.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockEnsState);
    }
    return mockEnsState;
  }),
}));

// Mock contributor profile modal store
vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: vi.fn(),
  }),
}));

// Mock team profiles hook
vi.mock("@/hooks/useTeamProfiles", () => ({
  useTeamProfiles: () => ({
    teamProfiles: [],
  }),
}));

// Mock project instance hook
vi.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: () => ({
    project: mockProject,
  }),
}));

// Mock copy to clipboard hook
vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, vi.fn()],
}));

// Mock react-query
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: {
        "0x1111111111111111111111111111111111111111": "Owner",
        "0x2222222222222222222222222222222222222222": "Admin",
        "0x3333333333333333333333333333333333333333": "Member",
      },
      isLoading: false,
      isFetching: false,
    }),
  };
});

// Mock dialog components
vi.mock("@/components/Dialogs/Member/InviteMember", () => ({
  InviteMemberDialog: () => <button data-testid="invite-member-dialog">Invite Member</button>,
}));

vi.mock("@/components/Dialogs/Member/DeleteMember", () => ({
  DeleteMemberDialog: () => <button data-testid="delete-member-dialog">Delete</button>,
}));

vi.mock("@/components/Dialogs/Member/DemoteMember", () => ({
  DemoteMemberDialog: () => <button data-testid="demote-member-dialog">Demote</button>,
}));

vi.mock("@/components/Dialogs/Member/PromoteMember", () => ({
  PromoteMemberDialog: () => <button data-testid="promote-member-dialog">Promote</button>,
}));

// Mock icons
vi.mock("@/components/Icons", () => ({
  GithubIcon: () => <svg data-testid="github-icon" />,
  LinkedInIcon: () => <svg data-testid="linkedin-icon" />,
  Twitter2Icon: () => <svg data-testid="twitter-icon" />,
}));

vi.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: () => <svg data-testid="farcaster-icon" />,
}));

// Mock ExternalLink
vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Mock Skeleton
vi.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}));

describe("TeamContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  beforeEach(async () => {
    // Override mock for empty project
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: unknown) => unknown) => {
        const state = {
          project: null,
          isProjectOwner: false,
          isProjectAdmin: false,
        };
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      }
    );
    (useOwnerStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: unknown) => unknown) => {
        const state = { isOwner: false };
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      }
    );
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
