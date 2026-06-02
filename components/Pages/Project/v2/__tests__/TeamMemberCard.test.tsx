import { fireEvent, render, screen } from "@testing-library/react";
import type { TeamProfile } from "@/types/team-profile";
import "@testing-library/jest-dom";
import { TeamMemberCard } from "../TeamContent/TeamMemberCard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: vi.fn(() => "/"),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    address: "0x1234567890123456789012345678901234567890",
  }),
}));

// Mock project store
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    slug: "test-project",
  },
  members: [],
};

// Create store state for use with selectors
const mockStoreState = {
  project: mockProject,
  isProjectOwner: false,
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

// Mock EFP store
const mockPopulateEfp = vi.fn();
const mockPopulateCommonFollowers = vi.fn();

const mockEfpState = {
  efpData: {
    "0x1234567890123456789012345678901234567890": {
      followers_count: 10,
      following_count: 5,
      isFetching: false,
      error: false,
    },
  } as Record<
    string,
    {
      followers_count?: number;
      following_count?: number;
      commonFollowers?: { address: string }[];
      commonFollowersLength?: number;
      isFetching?: boolean;
      isFetchingCommon?: boolean;
      error?: boolean;
    }
  >,
  populateEfp: mockPopulateEfp,
  populateCommonFollowers: mockPopulateCommonFollowers,
};

vi.mock("@/store/efp", () => ({
  useEFP: vi.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockEfpState);
    }
    return mockEfpState;
  }),
}));

// Mock contributor profile modal store
const mockOpenModal = vi.fn();
vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenModal,
  }),
}));

// Mock team profiles hook with factory for per-test overrides
const createMockTeamProfile = (
  overrides: Partial<TeamProfile["data"]> & { recipient?: string } = {}
): TeamProfile => {
  const { recipient, ...dataOverrides } = overrides;
  return {
    recipient: recipient ?? "0x1234567890123456789012345678901234567890",
    data: {
      name: "John Doe",
      email: "john@example.com",
      aboutMe: "A test user",
      twitter: "johndoe",
      github: "johndoe",
      linkedin: "johndoe",
      farcaster: "johndoe",
      ...dataOverrides,
    },
  } as TeamProfile;
};

let mockTeamProfiles: TeamProfile[] = [createMockTeamProfile()];

vi.mock("@/hooks/useTeamProfiles", () => ({
  useTeamProfiles: () => ({
    teamProfiles: mockTeamProfiles,
  }),
}));

// Mock project instance hook
vi.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: () => ({
    project: mockProject,
  }),
}));

// Mock copy to clipboard hook
const mockCopy = vi.fn();
vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

// Mock react-query
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      "0x1234567890123456789012345678901234567890": "Owner",
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock dialog components
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
  GithubIcon: ({ className }: { className?: string }) => (
    <svg data-testid="github-icon" className={className} />
  ),
  LinkedInIcon: ({ className }: { className?: string }) => (
    <svg data-testid="linkedin-icon" className={className} />
  ),
  Twitter2Icon: ({ className }: { className?: string }) => (
    <svg data-testid="twitter-icon" className={className} />
  ),
}));

vi.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: ({ className }: { className?: string }) => (
    <svg data-testid="farcaster-icon" className={className} />
  ),
}));

// Mock ExternalLink
vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="external-link">
      {children}
    </a>
  ),
}));

// Mock Skeleton
vi.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("TeamMemberCard", () => {
  const defaultMember = "0x1234567890123456789012345678901234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamProfiles = [createMockTeamProfile()];
    mockEfpState.efpData = {};
  });

  describe("Rendering", () => {
    it("should render the team member card", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("team-member-card")).toBeInTheDocument();
    });

    it("should display member name from profile", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-name")).toHaveTextContent("John Doe");
    });

    it("should display member role when not a regular member", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-role")).toHaveTextContent("Owner");
    });

    it("should display member address", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-address")).toHaveTextContent(defaultMember);
    });

    it("should display member email when available", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-email")).toHaveTextContent("john@example.com");
    });

    it("should display about me text when available", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-about")).toHaveTextContent("A test user");
    });

    it("should display social links when available", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-socials")).toBeInTheDocument();
      expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
      expect(screen.getByTestId("github-icon")).toBeInTheDocument();
      expect(screen.getByTestId("linkedin-icon")).toBeInTheDocument();
      expect(screen.getByTestId("farcaster-icon")).toBeInTheDocument();
    });

    it("should not display member email when unavailable", () => {
      mockTeamProfiles = [
        createMockTeamProfile({
          email: undefined,
          twitter: undefined,
          github: undefined,
          linkedin: undefined,
          farcaster: undefined,
        }),
      ];

      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.queryByTestId("member-email")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should copy address when copy button is clicked", () => {
      render(<TeamMemberCard member={defaultMember} />);

      fireEvent.click(screen.getByTestId("copy-address-button"));

      expect(mockCopy).toHaveBeenCalledWith(defaultMember);
    });

    it("should show edit button for current user", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("edit-profile-button")).toBeInTheDocument();
    });

    it("should open contributor profile modal when edit button is clicked", () => {
      render(<TeamMemberCard member={defaultMember} />);

      fireEvent.click(screen.getByTestId("edit-profile-button"));

      expect(mockOpenModal).toHaveBeenCalledWith({ isGlobal: false });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible copy button", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByLabelText("Copy address")).toBeInTheDocument();
    });

    it("should have accessible edit button", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByLabelText("Edit profile")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<TeamMemberCard member={defaultMember} className="custom-class" />);

      expect(screen.getByTestId("team-member-card")).toHaveClass("custom-class");
    });
  });

  describe("EFP stats", () => {
    beforeEach(() => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = {
        followers_count: 10,
        following_count: 5,
        isFetching: false,
        error: false,
      };
    });

    it("shows skeleton while EFP stats are loading", () => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = { isFetching: true };

      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-efp-stats")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    it("shows follower and following counts with correct pluralization", () => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = {
        followers_count: 1,
        following_count: 2,
        isFetching: false,
      };

      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-efp-stats")).toHaveTextContent("1 follower");
      expect(screen.getByTestId("member-efp-stats")).toHaveTextContent("2 following");
      expect(screen.getByTestId("member-efp-stats")).not.toHaveTextContent("followings");
    });

    it("shows retry when EFP stats errored", () => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = {
        error: true,
        isFetching: false,
      };

      render(<TeamMemberCard member={defaultMember} />);

      fireEvent.click(screen.getByTestId("member-efp-retry"));
      expect(mockPopulateEfp).toHaveBeenCalledWith([defaultMember]);
    });

    it("shows common followers row when length is greater than zero", () => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = {
        commonFollowersLength: 2,
        commonFollowers: [
          { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
          { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
        ],
        isFetchingCommon: false,
      };

      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.getByTestId("member-efp-common-followers")).toHaveTextContent(
        "2 followers you know"
      );
    });

    it("hides common followers row when length is zero", () => {
      mockEfpState.efpData[defaultMember.toLowerCase()] = {
        commonFollowersLength: 0,
        commonFollowers: [],
        isFetchingCommon: false,
      };

      render(<TeamMemberCard member={defaultMember} />);

      expect(screen.queryByTestId("member-efp-common-followers")).not.toBeInTheDocument();
    });

    it("calls populateCommonFollowers when viewer is connected", () => {
      render(<TeamMemberCard member={defaultMember} />);

      expect(mockPopulateCommonFollowers).toHaveBeenCalledWith(
        defaultMember,
        "0x1234567890123456789012345678901234567890"
      );
    });
  });
});
