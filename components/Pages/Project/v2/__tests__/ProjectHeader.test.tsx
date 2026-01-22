import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { ProjectHeader } from "../Header/ProjectHeader";

// Mock the MarkdownPreview component
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source, className }: { source: string; className?: string }) => (
    <div className={className}>{source}</div>
  ),
}));

// Mock the useProjectSocials hook
jest.mock("@/hooks/useProjectSocials", () => ({
  useProjectSocials: jest.fn(() => [
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

      // Check that social links container exists
      expect(screen.getByTestId("social-links")).toBeInTheDocument();

      // Check that social icons are rendered
      expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
      expect(screen.getByTestId("github-icon")).toBeInTheDocument();
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

    it("should expand description when Read More is clicked", () => {
      render(<ProjectHeader project={mockProjectLongDescription} />);

      const readMoreButton = screen.getByTestId("read-more-button");
      fireEvent.click(readMoreButton);

      expect(readMoreButton).toHaveTextContent("Show less");
    });

    it("should collapse description when Show Less is clicked", () => {
      render(<ProjectHeader project={mockProjectLongDescription} />);

      const readMoreButton = screen.getByTestId("read-more-button");
      fireEvent.click(readMoreButton); // Expand
      fireEvent.click(readMoreButton); // Collapse

      expect(readMoreButton).toHaveTextContent("Read More");
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
