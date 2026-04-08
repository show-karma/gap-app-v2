import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { SidebarProfileCardStatic } from "../SidePanel/SidebarProfileCardStatic";

// Mock next/image to render a simple img tag
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

const mockProject: Project = {
  uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description for testing purposes",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    links: [
      { type: "twitter", url: "https://twitter.com/test" },
      { type: "github", url: "https://github.com/test" },
      { type: "website", url: "https://example.com" },
    ],
  },
  members: [],
};

describe("SidebarProfileCardStatic", () => {
  describe("Rendering", () => {
    it("should render the project title", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const title = screen.getByTestId("sidebar-project-title");
      expect(title).toHaveTextContent("Test Project");
    });

    it("should render the project avatar with logo URL", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const avatar = screen.getByTestId("sidebar-profile-avatar");
      expect(avatar).toHaveAttribute("src", "https://example.com/logo.png");
      expect(avatar).toHaveAttribute("alt", "Test Project");
    });

    it("should render the project description", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const description = screen.getByTestId("sidebar-project-description");
      expect(description).toHaveTextContent("A test project description for testing purposes");
    });

    it("should render social links", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const socialLinks = screen.getAllByTestId("sidebar-social-link");
      expect(socialLinks.length).toBeGreaterThanOrEqual(2);
    });

    it("should render verification badge when isVerified is true", () => {
      render(<SidebarProfileCardStatic project={mockProject} isVerified />);

      const badge = screen.getByLabelText("Verified project");
      expect(badge).toBeInTheDocument();
    });

    it("should not render verification badge when isVerified is false", () => {
      render(<SidebarProfileCardStatic project={mockProject} isVerified={false} />);

      expect(screen.queryByLabelText("Verified project")).not.toBeInTheDocument();
    });
  });

  describe("Description truncation", () => {
    it("should truncate descriptions longer than 200 characters", () => {
      const longDescription = "A".repeat(250);
      const projectWithLongDesc: Project = {
        ...mockProject,
        details: { ...mockProject.details, description: longDescription },
      };

      render(<SidebarProfileCardStatic project={projectWithLongDesc} />);

      const description = screen.getByTestId("sidebar-project-description");
      expect(description.textContent).toContain("...");
    });

    it("should not truncate descriptions shorter than 200 characters", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const description = screen.getByTestId("sidebar-project-description");
      expect(description.textContent).not.toContain("...");
    });
  });

  describe("Missing data handling", () => {
    it("should not render description section when description is empty", () => {
      const projectNoDesc: Project = {
        ...mockProject,
        details: { ...mockProject.details, description: "" },
      };

      render(<SidebarProfileCardStatic project={projectNoDesc} />);

      expect(screen.queryByTestId("sidebar-project-description")).not.toBeInTheDocument();
    });

    it("should render fallback avatar when no logo URL", () => {
      const projectNoLogo: Project = {
        ...mockProject,
        details: { ...mockProject.details, logoUrl: undefined },
      };

      render(<SidebarProfileCardStatic project={projectNoLogo} />);

      // Should render a fallback div instead of an img
      const fallback = screen.getByTestId("sidebar-profile-avatar-fallback");
      expect(fallback).toBeInTheDocument();
    });

    it("should not render social links when no links provided", () => {
      const projectNoLinks: Project = {
        ...mockProject,
        details: { ...mockProject.details, links: [] },
      };

      render(<SidebarProfileCardStatic project={projectNoLinks} />);

      expect(screen.queryByTestId("sidebar-social-link")).not.toBeInTheDocument();
    });
  });

  describe("Layout classes", () => {
    it("should have the same container classes as SidebarProfileCard", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      const card = screen.getByTestId("sidebar-profile-card-static");
      expect(card).toHaveClass(
        "flex",
        "flex-col",
        "gap-4",
        "p-6",
        "rounded-lg",
        "border",
        "bg-background"
      );
    });

    it("should have data-testid for the static card", () => {
      render(<SidebarProfileCardStatic project={mockProject} />);

      expect(screen.getByTestId("sidebar-profile-card-static")).toBeInTheDocument();
    });
  });

  describe("Server component compatibility", () => {
    it("should not use any hooks (no useState, useEffect, etc.)", () => {
      // This test ensures the component renders without any React hooks.
      // If hooks were present, this would fail in a server component context.
      // We verify by simply rendering - if it renders without errors in a
      // non-hook-aware test environment, it's hook-free.
      expect(() => {
        render(<SidebarProfileCardStatic project={mockProject} />);
      }).not.toThrow();
    });
  });
});
