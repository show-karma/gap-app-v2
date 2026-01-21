import { render, screen } from "@testing-library/react";
import type { Project } from "@/types/v2/project";
import { ProjectCard } from "../ProjectCard";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock ProfilePicture component
jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name, alt }: { name: string; alt: string }) => (
    <div data-testid="profile-picture">{alt || name}</div>
  ),
}));

// Mock MarkdownPreview component
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <span>{source}</span>,
}));

describe("ProjectCard", () => {
  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    uid: "0x123" as `0x${string}`,
    chainID: 10,
    owner: "0xowner" as `0x${string}`,
    details: {
      title: "Test Project",
      description: "A test project description",
      slug: "test-project",
      tags: [],
    },
    members: [],
    createdAt: "2024-01-15T00:00:00.000Z",
    ...overrides,
  });

  describe("rendering basic project info", () => {
    it("should render project title", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      // Use getAllByText and check for the h3 heading element
      const titles = screen.getAllByText("Test Project");
      const headingTitle = titles.find((el) => el.tagName.toLowerCase() === "h3");
      expect(headingTitle).toBeInTheDocument();
    });

    it("should render project description", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("A test project description")).toBeInTheDocument();
    });

    it("should render created date", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText(/Created on/)).toBeInTheDocument();
    });

    it("should link to project page", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/project/test-project");
    });

    it("should show fallback description when none provided", () => {
      const project = createMockProject({
        details: {
          title: "No Desc Project",
          slug: "no-desc",
          tags: [],
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("No description available")).toBeInTheDocument();
    });

    it("should show mission summary as fallback description", () => {
      const project = createMockProject({
        details: {
          title: "Mission Project",
          slug: "mission-project",
          missionSummary: "Our mission is to help",
          tags: [],
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("Our mission is to help")).toBeInTheDocument();
    });
  });

  describe("stats display with stats data", () => {
    it("should display grants count from stats", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 5,
          grantMilestonesCount: 0,
          roadmapItemsCount: 0,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("5 grants")).toBeInTheDocument();
    });

    it("should display singular 'grant' when count is 1", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 1,
          grantMilestonesCount: 0,
          roadmapItemsCount: 0,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("1 grant")).toBeInTheDocument();
    });

    it("should display grant milestones count from stats", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 0,
          grantMilestonesCount: 12,
          roadmapItemsCount: 0,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("12 milestones")).toBeInTheDocument();
    });

    it("should display singular 'milestone' when count is 1", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 0,
          grantMilestonesCount: 1,
          roadmapItemsCount: 0,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("1 milestone")).toBeInTheDocument();
    });

    it("should display roadmap items count from stats", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 0,
          grantMilestonesCount: 0,
          roadmapItemsCount: 7,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("7 roadmap items")).toBeInTheDocument();
    });

    it("should display singular 'roadmap item' when count is 1", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 0,
          grantMilestonesCount: 0,
          roadmapItemsCount: 1,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("1 roadmap item")).toBeInTheDocument();
    });

    it("should display all stats together", () => {
      const project = createMockProject({
        stats: {
          grantsCount: 3,
          grantMilestonesCount: 8,
          roadmapItemsCount: 4,
        },
      });
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("3 grants")).toBeInTheDocument();
      expect(screen.getByText("8 milestones")).toBeInTheDocument();
      expect(screen.getByText("4 roadmap items")).toBeInTheDocument();
    });
  });

  describe("stats display without stats data", () => {
    it("should show 0 grants when stats not provided", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("0 grants")).toBeInTheDocument();
    });

    it("should show 0 milestones when stats not provided", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("0 milestones")).toBeInTheDocument();
    });

    it("should show 0 roadmap items when stats not provided", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} index={0} />);

      expect(screen.getByText("0 roadmap items")).toBeInTheDocument();
    });
  });

  describe("color assignment", () => {
    const EXPECTED_COLORS = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-indigo-500",
    ];

    it("should assign different colors based on index", () => {
      const project = createMockProject();

      // Test first 10 indices
      for (let i = 0; i < 10; i++) {
        const { container } = render(<ProjectCard project={project} index={i} />);
        const colorBar = container.querySelector(`.${EXPECTED_COLORS[i]}`);
        expect(colorBar).toBeInTheDocument();
      }
    });

    it("should cycle colors after index 10", () => {
      const project = createMockProject();

      const { container } = render(<ProjectCard project={project} index={10} />);
      // Index 10 should use color at index 0 (blue-500)
      const colorBar = container.querySelector(".bg-blue-500");
      expect(colorBar).toBeInTheDocument();
    });
  });
});
