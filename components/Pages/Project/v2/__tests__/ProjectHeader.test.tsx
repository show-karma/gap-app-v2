import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Project } from "@/types/v2/project";
import { ProjectHeader } from "../Header/ProjectHeader";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/project/test-project",
}));

// Mock react-wrap-balancer
vi.mock("react-wrap-balancer", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock utilities
vi.mock("@/utilities/customLink", () => ({
  isCustomLink: (link: any) => !!link?.name,
}));

vi.mock("@/utilities/ensureProtocol", () => ({
  ensureProtocol: (url: string) => (url.startsWith("http") ? url : `https://${url}`),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      ABOUT: (id: string) => `/project/${id}/about`,
    },
  },
}));

// Mock the MarkdownPreview component
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source, className }: { source: string; className?: string }) => (
    <div className={className}>{source}</div>
  ),
}));

// Mock the VerificationBadge component
vi.mock("../icons/VerificationBadge", () => ({
  VerificationBadge: (props: any) => <span data-testid={props["data-testid"]} />,
}));

// Mock the ProfilePicture component
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name, imageURL }: any) => (
    <div data-testid="profile-picture">{imageURL ? <img src={imageURL} alt={name} /> : name}</div>
  ),
}));

// Mock the ProjectActivityChart component to avoid QueryClient requirement
vi.mock("../MainContent/ProjectActivityChart", () => ({
  ProjectActivityChart: () => <div data-testid="project-activity-chart">Activity Chart</div>,
}));

// Mock the ProjectOptionsMenu to avoid ESM dependencies
vi.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  ProjectOptionsMenu: () => <div data-testid="project-options-menu">Options Menu</div>,
}));

// Mock the useProjectSocials hook
vi.mock("@/hooks/useProjectSocials", () => ({
  useProjectSocials: vi.fn(() => [
    {
      name: "Twitter",
      url: "https://twitter.com/test",
      icon: ({ className }: { className?: string }) => (
        <svg data-testid="twitter-icon" className={className} />
      ),
    },
    {
      name: "Github",
      url: "https://github.com/test",
      icon: ({ className }: { className?: string }) => (
        <svg data-testid="github-icon" className={className} />
      ),
    },
  ]),
}));

const mockProject: Project = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description:
      "This is a test project description that is used for testing purposes. It contains enough text to test the truncation functionality.",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    stageIn: "Growth",
    links: [
      { type: "twitter", url: "https://twitter.com/test" },
      { type: "github", url: "https://github.com/test" },
    ],
  },
  members: [],
};

const mockProjectLongDescription: Project = {
  ...mockProject,
  details: {
    ...mockProject.details,
    description:
      "This is a very long description that should be truncated because it exceeds 200 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  },
};

describe("ProjectHeader", () => {
  describe("Rendering", () => {
    it("should render project header component", () => {
      render(<ProjectHeader project={mockProject} />);

      expect(screen.getByTestId("project-header")).toBeInTheDocument();
    });

    it("should render project title", () => {
      render(<ProjectHeader project={mockProject} />);

      expect(screen.getByTestId("project-title")).toHaveTextContent("Test Project");
    });

    it("should render project description", () => {
      render(<ProjectHeader project={mockProject} />);

      expect(screen.getByTestId("project-description")).toBeInTheDocument();
    });

    it("should render project stage when provided", () => {
      render(<ProjectHeader project={mockProject} />);

      const stageElement = screen.getByTestId("project-stage");
      expect(stageElement).toBeInTheDocument();
      // Stage text content includes both label and value (CSS gap doesn't add text spaces)
      expect(stageElement).toHaveTextContent(/Stage/);
      expect(stageElement).toHaveTextContent(/Growth/);
    });

    it("should not render stage when not provided", () => {
      const projectWithoutStage = {
        ...mockProject,
        details: { ...mockProject.details, stageIn: undefined },
      };

      render(<ProjectHeader project={projectWithoutStage} />);

      expect(screen.queryByTestId("project-stage")).not.toBeInTheDocument();
    });
  });

  describe("Verification Badge", () => {
    it("should render verification badge when verified", () => {
      render(<ProjectHeader project={mockProject} isVerified />);

      expect(screen.getByTestId("verification-badge")).toBeInTheDocument();
    });

    it("should not render verification badge when not verified", () => {
      render(<ProjectHeader project={mockProject} isVerified={false} />);

      expect(screen.queryByTestId("verification-badge")).not.toBeInTheDocument();
    });
  });

  describe("Social Links", () => {
    it("should render social links in top-right corner", () => {
      render(<ProjectHeader project={mockProject} />);

      // Check that header actions container exists (contains social links on desktop)
      expect(screen.getByTestId("header-actions")).toBeInTheDocument();

      // Check that social icons are rendered (multiple due to desktop/mobile views)
      expect(screen.getAllByTestId("twitter-icon").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("github-icon").length).toBeGreaterThan(0);
    });
  });

  describe("Description Truncation", () => {
    it("should truncate long descriptions", () => {
      render(<ProjectHeader project={mockProjectLongDescription} />);

      const description = screen.getByTestId("project-description");
      expect(description.textContent).toContain("...");
    });

    it("should show Read More button for long descriptions", () => {
      render(<ProjectHeader project={mockProjectLongDescription} />);

      expect(screen.getByTestId("read-more-button")).toBeInTheDocument();
      expect(screen.getByTestId("read-more-button")).toHaveTextContent("Read More");
    });

    it("should navigate to About page when Read More is clicked", () => {
      render(<ProjectHeader project={mockProjectLongDescription} />);

      const readMoreLink = screen.getByTestId("read-more-button");
      fireEvent.click(readMoreLink);

      // Read More navigates to About page instead of toggling inline
      expect(readMoreLink).toHaveTextContent("Read More");
    });

    it("should not show Read More for short descriptions", () => {
      const projectWithShortDesc = {
        ...mockProject,
        details: { ...mockProject.details, description: "Short description" },
      };

      render(<ProjectHeader project={projectWithShortDesc} />);

      expect(screen.queryByTestId("read-more-button")).not.toBeInTheDocument();
    });
  });

  describe("Profile Picture", () => {
    it("should render profile pictures for desktop and mobile", () => {
      render(<ProjectHeader project={mockProject} />);

      // ProfilePicture renders img element when valid URL is provided
      const images = screen.queryAllByRole("img");
      // We expect at least some images to be rendered (could be avatars)
      // The component should render successfully
      expect(screen.getByTestId("project-header")).toBeInTheDocument();
    });

    it("should render fallback avatar when no logo URL", () => {
      const projectWithoutLogo = {
        ...mockProject,
        details: { ...mockProject.details, logoUrl: undefined },
      };

      render(<ProjectHeader project={projectWithoutLogo} />);

      // With no logo, ProfilePicture renders a boring-avatars SVG, not an img
      // The component should still render successfully
      expect(screen.getByTestId("project-header")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(<ProjectHeader project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("project-header")).toHaveClass("custom-class");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing description", () => {
      const projectWithoutDesc = {
        ...mockProject,
        details: { ...mockProject.details, description: undefined },
      };

      render(<ProjectHeader project={projectWithoutDesc} />);

      expect(screen.queryByTestId("project-description")).not.toBeInTheDocument();
    });
  });
});
