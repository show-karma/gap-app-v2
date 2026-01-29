import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AboutContent } from "../MainContent/AboutContent";

// Mock MarkdownPreview to avoid issues with dynamic import
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source, className }: { source: string; className?: string }) => (
    <div data-testid="markdown-preview" className={className}>
      {source}
    </div>
  ),
}));

const createMockProject = (
  details: Partial<{
    title: string;
    description: string;
    missionSummary: string;
    problem: string;
    solution: string;
    businessModel: string;
    pathToTake: string;
    locationOfImpact: string;
    raisedMoney: string;
    slug: string;
  }> = {}
) => ({
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    slug: "test-project",
    ...details,
  },
  members: [],
});

describe("AboutContent", () => {
  describe("Rendering", () => {
    it("should render empty state when no content is available", () => {
      const project = createMockProject({});

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-content-empty")).toBeInTheDocument();
      expect(
        screen.getByText("No additional information available for this project.")
      ).toBeInTheDocument();
    });

    it("should render the about content container when content is available", () => {
      const project = createMockProject({
        description: "A test project description",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-content")).toBeInTheDocument();
    });
  });

  describe("Section Rendering", () => {
    it("should render description section", () => {
      const project = createMockProject({
        description: "This is the project description",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("This is the project description")).toBeInTheDocument();
    });

    it("should render mission section", () => {
      const project = createMockProject({
        missionSummary: "Our mission is to help developers",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-mission")).toBeInTheDocument();
      expect(screen.getByText("Mission")).toBeInTheDocument();
      expect(screen.getByText("Our mission is to help developers")).toBeInTheDocument();
    });

    it("should render problem section", () => {
      const project = createMockProject({
        problem: "The problem we solve",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-problem")).toBeInTheDocument();
      expect(screen.getByText("Problem")).toBeInTheDocument();
      expect(screen.getByText("The problem we solve")).toBeInTheDocument();
    });

    it("should render solution section", () => {
      const project = createMockProject({
        solution: "Our solution approach",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-solution")).toBeInTheDocument();
      expect(screen.getByText("Solution")).toBeInTheDocument();
      expect(screen.getByText("Our solution approach")).toBeInTheDocument();
    });

    it("should render business model section", () => {
      const project = createMockProject({
        businessModel: "SaaS subscription model",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-business-model")).toBeInTheDocument();
      expect(screen.getByText("Business Model")).toBeInTheDocument();
      expect(screen.getByText("SaaS subscription model")).toBeInTheDocument();
    });

    it("should render path to success section", () => {
      const project = createMockProject({
        pathToTake: "Our roadmap to success",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-path-to-success")).toBeInTheDocument();
      expect(screen.getByText("Path to Success")).toBeInTheDocument();
      expect(screen.getByText("Our roadmap to success")).toBeInTheDocument();
    });

    it("should render location of impact section", () => {
      const project = createMockProject({
        locationOfImpact: "Global",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-location")).toBeInTheDocument();
      expect(screen.getByText("Location of Impact")).toBeInTheDocument();
      expect(screen.getByText("Global")).toBeInTheDocument();
    });

    it("should render funds raised section", () => {
      const project = createMockProject({
        raisedMoney: "$1,000,000",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-funds-raised")).toBeInTheDocument();
      expect(screen.getByText("Total Funds Raised")).toBeInTheDocument();
      expect(screen.getByText("$1,000,000")).toBeInTheDocument();
    });
  });

  describe("Multiple Sections", () => {
    it("should render multiple sections when available", () => {
      const project = createMockProject({
        description: "Test description",
        missionSummary: "Test mission",
        problem: "Test problem",
        solution: "Test solution",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
      expect(screen.getByTestId("about-section-mission")).toBeInTheDocument();
      expect(screen.getByTestId("about-section-problem")).toBeInTheDocument();
      expect(screen.getByTestId("about-section-solution")).toBeInTheDocument();
    });

    it("should only render sections with content", () => {
      const project = createMockProject({
        description: "Test description",
        missionSummary: "", // Empty - should not render
        problem: "Test problem",
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
      expect(screen.getByTestId("about-section-problem")).toBeInTheDocument();
      expect(screen.queryByTestId("about-section-mission")).not.toBeInTheDocument();
    });

    it("should not render sections with only whitespace", () => {
      const project = createMockProject({
        description: "Test description",
        missionSummary: "   ", // Whitespace only - should not render
      });

      render(<AboutContent project={project} />);

      expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
      expect(screen.queryByTestId("about-section-mission")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      const project = createMockProject({
        description: "Test description",
      });

      render(<AboutContent project={project} className="custom-class" />);

      expect(screen.getByTestId("about-content")).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const project = createMockProject({
        description: "Test description",
        missionSummary: "Test mission",
      });

      render(<AboutContent project={project} />);

      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings).toHaveLength(2);
    });

    it("should render icons with proper containers", () => {
      const project = createMockProject({
        description: "Test description",
      });

      render(<AboutContent project={project} />);

      // Check that icon container exists with proper styling classes
      const section = screen.getByTestId("about-section-description");
      const iconContainer = section.querySelector(".w-10.h-10");
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
