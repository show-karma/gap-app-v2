import { render, screen } from "@testing-library/react";
import { GrantNotCompletedButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantNotCompletedButton";
import "@testing-library/jest-dom";

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
}));

describe("GrantNotCompletedButton", () => {
  const mockProject = {
    uid: "project-456",
    details: {
      slug: "test-project",
    },
  } as any;

  const mockGrantUID = "grant-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render link component", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("should show default 'Mark as Complete' text", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
    });

    it("should show CheckCircleIcon", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
    });

    it("should apply correct CSS classes", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass(
        "hover:opacity-75",
        "flex",
        "flex-row",
        "items-center",
        "justify-center",
        "gap-2",
        "rounded-md",
        "bg-green-600",
        "px-3.5",
        "py-2",
        "text-sm",
        "font-semibold",
        "text-white",
        "hover:bg-green-700"
      );
    });
  });

  describe("Navigation", () => {
    it("should link to grant completion page using project slug", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/project/test-project/funding/grant-123/complete-grant"
      );
    });

    it("should fallback to project uid when slug is not available", () => {
      const projectWithoutSlug = {
        uid: "project-456",
        details: {},
      } as any;

      render(<GrantNotCompletedButton project={projectWithoutSlug} grantUID={mockGrantUID} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/project/project-456/funding/grant-123/complete-grant");
    });
  });

  describe("Text Customization", () => {
    it("should use custom text prop when provided", () => {
      const customText = "Complete This Grant";

      render(
        <GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} text={customText} />
      );

      expect(screen.getByText(customText)).toBeInTheDocument();
      expect(screen.queryByText("Mark as Complete")).not.toBeInTheDocument();
    });

    it("should use default text when text prop is undefined", () => {
      render(
        <GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} text={undefined} />
      );

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
    });

    it("should handle various text values", () => {
      const { rerender } = render(
        <GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} text="First Text" />
      );

      expect(screen.getByText("First Text")).toBeInTheDocument();

      rerender(
        <GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} text="Second Text" />
      );

      expect(screen.getByText("Second Text")).toBeInTheDocument();
      expect(screen.queryByText("First Text")).not.toBeInTheDocument();
    });
  });

  describe("Icon Rendering", () => {
    it("should render CheckCircleIcon with correct className", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />);

      const icon = screen.getByTestId("check-circle-icon");
      expect(icon).toHaveClass("h-5", "w-5");
    });

    it("should render icon inside a div with h-5 w-5", () => {
      const { container } = render(
        <GrantNotCompletedButton project={mockProject} grantUID={mockGrantUID} />
      );

      const iconContainer = container.querySelector(".h-5.w-5");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Props Combinations", () => {
    it("should handle all props correctly", () => {
      const customProject = {
        uid: "custom-project",
        details: {
          slug: "custom-slug",
        },
      } as any;

      const customGrantUID = "custom-grant";

      render(
        <GrantNotCompletedButton
          project={customProject}
          grantUID={customGrantUID}
          text="Custom Text"
        />
      );

      expect(screen.getByText("Custom Text")).toBeInTheDocument();
      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/project/custom-slug/funding/custom-grant/complete-grant"
      );
    });
  });
});
