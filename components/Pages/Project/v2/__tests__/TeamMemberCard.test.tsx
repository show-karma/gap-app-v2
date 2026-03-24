import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TeamMemberCard } from "../TeamContent/TeamMemberCard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
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

// Mock contributor profile modal store
const mockOpenModal = vi.fn();
vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenModal,
  }),
}));

// Mock team profiles hook
vi.mock("@/hooks/useTeamProfiles", () => ({
  useTeamProfiles: () => ({
    teamProfiles: [
      {
        recipient: "0x1234567890123456789012345678901234567890",
        data: {
          name: "John Doe",
          aboutMe: "A test user",
          twitter: "johndoe",
          github: "johndoe",
          linkedin: "johndoe",
          farcaster: "johndoe",
        },
      },
    ],
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
});
