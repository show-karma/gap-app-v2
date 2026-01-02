import { render, screen } from "@testing-library/react";
import { AIEvaluationCard } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab/AIEvaluationCard";

// Mock the cn utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("AIEvaluationCard", () => {
  const mockIcon = <svg data-testid="mock-icon" />;

  describe("Rendering", () => {
    it("renders title and subtitle", () => {
      render(
        <AIEvaluationCard title="Test Title" subtitle="Test Subtitle" icon={mockIcon}>
          <div>Content</div>
        </AIEvaluationCard>
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
    });

    it("renders the icon", () => {
      render(
        <AIEvaluationCard title="Title" subtitle="Subtitle" icon={mockIcon}>
          <div>Content</div>
        </AIEvaluationCard>
      );

      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <AIEvaluationCard title="Title" subtitle="Subtitle" icon={mockIcon}>
          <div data-testid="child-content">Child Content</div>
        </AIEvaluationCard>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("renders action button when provided", () => {
      render(
        <AIEvaluationCard
          title="Title"
          subtitle="Subtitle"
          icon={mockIcon}
          action={<button type="button">Run Evaluation</button>}
        >
          <div>Content</div>
        </AIEvaluationCard>
      );

      expect(screen.getByText("Run Evaluation")).toBeInTheDocument();
    });

    it("does not render action area when no action provided", () => {
      const { container } = render(
        <AIEvaluationCard title="Title" subtitle="Subtitle" icon={mockIcon}>
          <div>Content</div>
        </AIEvaluationCard>
      );

      // Should only have one flex-shrink-0 element (the icon container)
      const flexShrinkElements = container.querySelectorAll(".flex-shrink-0");
      expect(flexShrinkElements.length).toBe(1);
    });
  });

  describe("Internal Styling", () => {
    it("applies internal styling when isInternal is true", () => {
      const { container } = render(
        <AIEvaluationCard
          title="Internal Evaluation"
          subtitle="Reviewer only"
          icon={mockIcon}
          isInternal
        >
          <div>Content</div>
        </AIEvaluationCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-purple-200");
    });

    it("applies default styling when isInternal is false", () => {
      const { container } = render(
        <AIEvaluationCard
          title="External Evaluation"
          subtitle="Visible to all"
          icon={mockIcon}
          isInternal={false}
        >
          <div>Content</div>
        </AIEvaluationCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-gray-200");
    });

    it("applies internal subtitle styling", () => {
      render(
        <AIEvaluationCard title="Title" subtitle="Internal Subtitle" icon={mockIcon} isInternal>
          <div>Content</div>
        </AIEvaluationCard>
      );

      const subtitle = screen.getByText("Internal Subtitle");
      expect(subtitle.className).toContain("text-purple-600");
    });

    it("applies default subtitle styling", () => {
      render(
        <AIEvaluationCard title="Title" subtitle="Default Subtitle" icon={mockIcon}>
          <div>Content</div>
        </AIEvaluationCard>
      );

      const subtitle = screen.getByText("Default Subtitle");
      expect(subtitle.className).toContain("text-gray-500");
    });
  });

  describe("Custom Classes", () => {
    it("accepts custom className", () => {
      const { container } = render(
        <AIEvaluationCard
          title="Title"
          subtitle="Subtitle"
          icon={mockIcon}
          className="custom-class"
        >
          <div>Content</div>
        </AIEvaluationCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("custom-class");
    });
  });
});
