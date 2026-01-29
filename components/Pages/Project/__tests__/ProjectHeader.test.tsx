import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { ProjectHeader, type ProjectHeaderProps } from "../ProjectWrapper/ProjectHeader";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock ProfilePicture component
jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ alt, imageURL }: { alt: string; imageURL?: string }) => (
    <div data-testid="profile-picture" data-alt={alt} data-image-url={imageURL}>
      ProfilePicture
    </div>
  ),
}));

// Mock Globe icon
jest.mock("@/components/Icons", () => ({
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
}));

// Mock ExternalLink
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="external-link">
      {children}
    </a>
  ),
}));

describe("ProjectHeader", () => {
  const mockProject: Project = {
    uid: "0x123456789" as `0x${string}`,
    chainID: 1,
    owner: "0xOwner" as `0x${string}`,
    details: {
      title: "Test Project",
      description: "A test project description",
      slug: "test-project",
      logoUrl: "https://example.com/logo.png",
      tags: ["DeFi", "NFT", "Gaming"],
      links: [
        { url: "https://twitter.com/test", type: "twitter" },
        { url: "https://github.com/test", type: "github" },
      ],
    },
    members: [],
  };

  const mockSocials = [
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
  ];

  const mockCustomLinks = [
    { url: "https://custom1.com", name: "Custom Link 1" },
    { url: "https://custom2.com", name: "Custom Link 2" },
  ];

  const defaultProps: ProjectHeaderProps = {
    project: mockProject,
    socials: mockSocials,
    customLinks: [],
    isProjectAdmin: false,
  };

  describe("Project Information Display", () => {
    it("should render project title", () => {
      render(<ProjectHeader {...defaultProps} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Project");
    });

    it("should render ProfilePicture with correct props", () => {
      render(<ProjectHeader {...defaultProps} />);
      const profilePicture = screen.getByTestId("profile-picture");
      expect(profilePicture).toBeInTheDocument();
      expect(profilePicture).toHaveAttribute("data-alt", "Test Project");
      expect(profilePicture).toHaveAttribute("data-image-url", "https://example.com/logo.png");
    });

    it("should render project tags", () => {
      render(<ProjectHeader {...defaultProps} />);
      expect(screen.getByText("DeFi")).toBeInTheDocument();
      expect(screen.getByText("NFT")).toBeInTheDocument();
      expect(screen.getByText("Gaming")).toBeInTheDocument();
    });

    it("should not render tags section when no tags exist", () => {
      const projectWithoutTags = {
        ...mockProject,
        details: { ...mockProject.details, tags: [] },
      };
      render(<ProjectHeader {...defaultProps} project={projectWithoutTags} />);
      expect(screen.queryByText("DeFi")).not.toBeInTheDocument();
    });
  });

  describe("Social Links", () => {
    it("should render social icons", () => {
      render(<ProjectHeader {...defaultProps} />);
      expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
      expect(screen.getByTestId("github-icon")).toBeInTheDocument();
    });

    it("should render social links with correct hrefs", () => {
      render(<ProjectHeader {...defaultProps} />);
      const links = screen.getAllByRole("link");
      const twitterLink = links.find(
        (link) => link.getAttribute("href") === "https://twitter.com/test"
      );
      const githubLink = links.find(
        (link) => link.getAttribute("href") === "https://github.com/test"
      );
      expect(twitterLink).toBeInTheDocument();
      expect(githubLink).toBeInTheDocument();
    });

    it("should not render social section when no socials exist", () => {
      render(<ProjectHeader {...defaultProps} socials={[]} />);
      expect(screen.queryByTestId("twitter-icon")).not.toBeInTheDocument();
    });
  });

  describe("Custom Links", () => {
    it("should render globe icon when custom links exist", () => {
      render(<ProjectHeader {...defaultProps} customLinks={mockCustomLinks} />);
      expect(screen.getByTestId("globe-icon")).toBeInTheDocument();
    });

    it("should render custom link dropdown content", () => {
      render(<ProjectHeader {...defaultProps} customLinks={mockCustomLinks} />);
      expect(screen.getByText("Custom Link 1")).toBeInTheDocument();
      expect(screen.getByText("Custom Link 2")).toBeInTheDocument();
    });

    it("should not render globe icon when no custom links exist", () => {
      render(<ProjectHeader {...defaultProps} customLinks={[]} />);
      expect(screen.queryByTestId("globe-icon")).not.toBeInTheDocument();
    });
  });

  describe("Admin Actions", () => {
    it("should render help link for project admins", () => {
      render(<ProjectHeader {...defaultProps} isProjectAdmin={true} />);
      expect(screen.getByText(/looking for help/i)).toBeInTheDocument();
      expect(screen.getByTestId("external-link")).toHaveAttribute(
        "href",
        "https://tally.so/r/w8e6GP"
      );
    });

    it("should not render help link for non-admins", () => {
      render(<ProjectHeader {...defaultProps} isProjectAdmin={false} />);
      expect(screen.queryByText(/looking for help/i)).not.toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("should handle undefined project gracefully", () => {
      render(<ProjectHeader {...defaultProps} project={undefined} />);
      // Should not crash and should render empty ProfilePicture
      expect(screen.getByTestId("profile-picture")).toBeInTheDocument();
    });

    it("should handle project without details", () => {
      const projectWithoutDetails = {
        ...mockProject,
        details: undefined as unknown as Project["details"],
      };
      render(<ProjectHeader {...defaultProps} project={projectWithoutDetails} />);
      expect(screen.getByTestId("profile-picture")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<ProjectHeader {...defaultProps} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should have target blank and rel noopener on external links", () => {
      render(<ProjectHeader {...defaultProps} />);
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });
});
