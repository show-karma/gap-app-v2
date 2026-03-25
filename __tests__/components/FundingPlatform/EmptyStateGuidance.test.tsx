import { render, screen } from "@testing-library/react";
import {
  EmptyStateGuidance,
  PostApprovalEmptyState,
  ReviewersEmptyState,
} from "@/components/FundingPlatform/EmptyStateGuidance";

describe("EmptyStateGuidance", () => {
  describe("rendering with default props", () => {
    it("should render with default title", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText("No Form Fields Yet")).toBeInTheDocument();
    });

    it("should render with default description", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText(/build your application form by adding fields/i)).toBeInTheDocument();
    });

    it("should show suggestions by default", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText(/suggested fields for grant applications/i)).toBeInTheDocument();
    });
  });

  describe("rendering with custom props", () => {
    it("should render with custom title", () => {
      render(<EmptyStateGuidance title="Custom Title" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should render with custom description", () => {
      render(<EmptyStateGuidance description="Custom description text" />);

      expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("should hide suggestions when showSuggestions is false", () => {
      render(<EmptyStateGuidance showSuggestions={false} />);

      expect(
        screen.queryByText(/suggested fields for grant applications/i)
      ).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<EmptyStateGuidance className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("suggested fields display", () => {
    it("should display all suggested fields", () => {
      render(<EmptyStateGuidance />);

      const expectedFields = [
        "Project Name",
        "Project Description",
        "Email Address",
        "Funding Amount",
        "Team Information",
        "Project Links",
        "Timeline",
      ];

      expectedFields.forEach((field) => {
        expect(screen.getByText(field)).toBeInTheDocument();
      });
    });

    it("should display field descriptions", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText("Short title for the project")).toBeInTheDocument();
      expect(screen.getByText("Detailed project overview")).toBeInTheDocument();
      expect(screen.getByText("Required for communication")).toBeInTheDocument();
      expect(screen.getByText("Requested funding in USD")).toBeInTheDocument();
    });

    it("should display help text about adding fields", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText(/click field types in the left panel/i)).toBeInTheDocument();
    });
  });

  describe("visual elements", () => {
    it("should render icon", () => {
      const { container } = render(<EmptyStateGuidance />);

      const iconContainer = container.querySelector(".bg-blue-100");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should have dashed border styling", () => {
      const { container } = render(<EmptyStateGuidance />);

      expect(container.firstChild).toHaveClass("border-dashed");
    });

    it("should render field icons", () => {
      const { container } = render(<EmptyStateGuidance />);

      // Should have multiple SVG icons for fields
      const svgElements = container.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(1);
    });
  });
});

describe("PostApprovalEmptyState", () => {
  it("should render with appropriate title", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.getByText("No Post-Approval Fields Yet")).toBeInTheDocument();
  });

  it("should render with appropriate description", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.getByText(/this form is optional/i)).toBeInTheDocument();
  });

  it("should not show suggestions", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.queryByText(/suggested fields for grant applications/i)).not.toBeInTheDocument();
  });

  it("should mention bank details and KYC", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.getByText(/bank details, KYC documents/i)).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<PostApprovalEmptyState className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });
});

describe("ReviewersEmptyState", () => {
  it("should render with appropriate title", () => {
    render(<ReviewersEmptyState />);

    expect(screen.getByText("No Reviewers Added Yet")).toBeInTheDocument();
  });

  it("should render with appropriate description", () => {
    render(<ReviewersEmptyState />);

    expect(
      screen.getByText(/add team members who will help review applications/i)
    ).toBeInTheDocument();
  });

  it("should display tip about wallet address and ENS", () => {
    render(<ReviewersEmptyState />);

    expect(screen.getByText(/wallet address or ENS name/i)).toBeInTheDocument();
  });

  it("should have purple-themed icon", () => {
    const { container } = render(<ReviewersEmptyState />);

    const iconContainer = container.querySelector(".bg-purple-100");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should have tip box with purple styling", () => {
    const { container } = render(<ReviewersEmptyState />);

    const tipBox = container.querySelector(".bg-purple-50");
    expect(tipBox).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<ReviewersEmptyState className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have dashed border styling", () => {
    const { container } = render(<ReviewersEmptyState />);

    expect(container.firstChild).toHaveClass("border-dashed");
  });
});
