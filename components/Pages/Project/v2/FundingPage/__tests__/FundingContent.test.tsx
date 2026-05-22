import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { FundingContent } from "../FundingContent";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: vi.fn(() => "/"),
}));

const mockProject: Project = {
  uid: "0x1234567890123456789012345678901234567890",
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
  },
  members: [],
};

// Default mock for grants
const defaultGrantsMock = {
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
      details: { title: "Completed Grant", description: "Another grant" },
      community: {
        details: { name: "Another Community", imageURL: "https://example.com/community2.png" },
      },
      completed: { uid: "completed-1", createdAt: new Date().toISOString() },
    },
  ],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => defaultGrantsMock),
}));

vi.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: () => ({
    isProjectAdmin: false,
    isProjectOwner: false,
  }),
}));

vi.mock("@/store", () => ({
  useOwnerStore: (selector?: (state: { isOwner: boolean }) => unknown) => {
    const state = { isOwner: false };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

const communitiesMock = { communities: [] as Array<{ uid: string }> };

vi.mock("@/store/communities", () => ({
  useCommunitiesStore: () => communitiesMock,
}));

describe("FundingContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communitiesMock.communities = [];
  });

  describe("Rendering with grants", () => {
    it("should render funding content container", () => {
      render(<FundingContent project={mockProject} />);

      expect(screen.getByTestId("funding-content")).toBeInTheDocument();
    });

    it("should display funding header with count", () => {
      render(<FundingContent project={mockProject} />);

      expect(screen.getByText("Funding (2)")).toBeInTheDocument();
    });

    it("should render grants list", () => {
      render(<FundingContent project={mockProject} />);

      expect(screen.getByTestId("grants-list")).toBeInTheDocument();
    });

    it("should render grant cards", () => {
      render(<FundingContent project={mockProject} />);

      const grantCards = screen.getAllByTestId("grant-card");
      expect(grantCards).toHaveLength(2);
    });

    it("should display grant titles", () => {
      render(<FundingContent project={mockProject} />);

      expect(screen.getByText("Test Grant 1")).toBeInTheDocument();
      expect(screen.getByText("Completed Grant")).toBeInTheDocument();
    });

    it("should display community names", () => {
      render(<FundingContent project={mockProject} />);

      expect(screen.getByText("Test Community")).toBeInTheDocument();
      expect(screen.getByText("Another Community")).toBeInTheDocument();
    });

    it("should show completed badge for completed grants", () => {
      render(<FundingContent project={mockProject} />);

      // The completed grant should have a "Completed" text badge
      // Note: We use getAllByText because "Completed Grant" also contains "Completed"
      const completedBadges = screen.getAllByText("Completed");
      // Find the one that's in the badge span (exact match, not partial)
      const badge = completedBadges.find((el) =>
        el.closest("span")?.className.includes("bg-green-100")
      );
      expect(badge).toBeInTheDocument();
    });
  });

  // Note: Empty state and Loading state tests are skipped because they require
  // dynamic mock changes which are difficult to achieve with Jest's module mocking.
  // The core functionality is tested through the ProjectFundingPage integration tests.

  describe("Authorization: + Add Funding button", () => {
    it("hides the Add button for users who are not project owner/admin/community admin", () => {
      render(<FundingContent project={mockProject} />);
      expect(screen.queryByTestId("add-funding-button")).not.toBeInTheDocument();
    });

    // Regression: community admin of ANY community should see the button on the
    // project's funding list — previously hidden because the store was only
    // primed on /admin and the per-grant flag is always false here.
    it("shows the Add button for community admins of any community", () => {
      communitiesMock.communities = [{ uid: "community-1" }];
      render(<FundingContent project={mockProject} />);
      expect(screen.getByTestId("add-funding-button")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<FundingContent project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("funding-content")).toHaveClass("custom-class");
    });
  });
});
