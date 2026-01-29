import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TeamMemberCard } from "../TeamContent/TeamMemberCard";

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
const mockOpenModal = jest.fn();
jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenModal,
  }),
}));

// Mock team profiles hook
jest.mock("@/hooks/useTeamProfiles", () => ({
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
jest.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: () => ({
    project: mockProject,
  }),
}));

// Mock copy to clipboard hook
const mockCopy = jest.fn();
jest.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

// Mock react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      "0x1234567890123456789012345678901234567890": "Owner",
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock dialog components
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

jest.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: ({ className }: { className?: string }) => (
    <svg data-testid="farcaster-icon" className={className} />
  ),
}));

// Mock ExternalLink
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="external-link">
      {children}
    </a>
  ),
}));

// Mock Skeleton
jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("TeamMemberCard", () => {
  const defaultMember = "0x1234567890123456789012345678901234567890";

  beforeEach(() => {
    jest.clearAllMocks();
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
