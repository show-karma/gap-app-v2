import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OnboardingSuggestions } from "@/components/Pages/OnboardingAssistant/OnboardingSuggestions";

describe("OnboardingSuggestions", () => {
  const mockOnSuggestionClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all three suggestion cards", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      expect(screen.getByText("Start from scratch")).toBeInTheDocument();
      expect(screen.getByText("Import from URL")).toBeInTheDocument();
      expect(screen.getByText("Document grants")).toBeInTheDocument();
    });

    it("should render descriptions for each suggestion", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      expect(screen.getByText(/guide you through creating/)).toBeInTheDocument();
      expect(screen.getByText(/Paste your website/)).toBeInTheDocument();
      expect(screen.getByText(/Add grants you've received/)).toBeInTheDocument();
    });

    it("should render header text", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      expect(screen.getByText("How would you like to get started?")).toBeInTheDocument();
    });

    it("should render subheader text", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      expect(screen.getByText(/Choose an option or type your own/)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onSuggestionClick when card clicked", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      fireEvent.click(screen.getByText("Start from scratch"));
      expect(mockOnSuggestionClick).toHaveBeenCalledTimes(1);
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(
        expect.stringContaining("create a new project profile")
      );
    });

    it("should call with correct query for Import from URL", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      fireEvent.click(screen.getByText("Import from URL"));
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(
        expect.stringContaining("website/proposal URL")
      );
    });

    it("should call with correct query for Document grants", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      fireEvent.click(screen.getByText("Document grants"));
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(
        expect.stringContaining("grants and milestones")
      );
    });
  });

  describe("disabled state", () => {
    it("should disable buttons when disabled prop is true", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} disabled />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toBeDisabled();
      }
    });

    it("should apply opacity when disabled", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} disabled />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toHaveClass("opacity-50");
      }
    });

    it("should not be disabled by default", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).not.toBeDisabled();
      }
    });
  });

  describe("accessibility", () => {
    it("should have aria-labels on buttons", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      expect(screen.getByLabelText("Start from scratch")).toBeInTheDocument();
      expect(screen.getByLabelText("Import from URL")).toBeInTheDocument();
      expect(screen.getByLabelText("Document grants")).toBeInTheDocument();
    });

    it("should use button type", () => {
      render(<OnboardingSuggestions onSuggestionClick={mockOnSuggestionClick} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
      }
    });
  });
});
