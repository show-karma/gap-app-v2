/**
 * Tests for EmptyStateGuidance, PostApprovalEmptyState, and ReviewersEmptyState.
 *
 * Focuses on behavioral concerns:
 * - Prop-driven conditional rendering (showSuggestions toggle, custom titles/descriptions)
 * - Correct default vs overridden content
 * - Composition: PostApprovalEmptyState and ReviewersEmptyState wrap EmptyStateGuidance
 *   with specific configuration
 * - className passthrough
 */

import { render, screen, within } from "@testing-library/react";
import {
  EmptyStateGuidance,
  PostApprovalEmptyState,
  ReviewersEmptyState,
} from "@/components/FundingPlatform/EmptyStateGuidance";

describe("EmptyStateGuidance", () => {
  describe("default prop behavior", () => {
    it("shows the default title, description, and suggestions section", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText("No Form Fields Yet")).toBeInTheDocument();
      expect(screen.getByText(/build your application form by adding fields/i)).toBeInTheDocument();
      expect(screen.getByText(/suggested fields for grant applications/i)).toBeInTheDocument();
    });
  });

  describe("prop-driven conditional rendering", () => {
    it("replaces title and description when custom props are provided", () => {
      render(<EmptyStateGuidance title="Custom Title" description="Custom description text" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom description text")).toBeInTheDocument();
      // Defaults should not appear
      expect(screen.queryByText("No Form Fields Yet")).not.toBeInTheDocument();
    });

    it("hides the suggestions section when showSuggestions is false", () => {
      render(<EmptyStateGuidance showSuggestions={false} />);

      expect(
        screen.queryByText(/suggested fields for grant applications/i)
      ).not.toBeInTheDocument();
      // Title should still be visible
      expect(screen.getByText("No Form Fields Yet")).toBeInTheDocument();
    });

    it("shows the suggestions section when showSuggestions is true (default)", () => {
      render(<EmptyStateGuidance showSuggestions={true} />);

      expect(screen.getByText(/suggested fields for grant applications/i)).toBeInTheDocument();
    });

    it("passes className to the root element", () => {
      const { container } = render(<EmptyStateGuidance className="my-custom-class" />);

      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  describe("suggested fields content", () => {
    it("renders all seven suggested fields with labels and descriptions", () => {
      render(<EmptyStateGuidance />);

      const expectedFields = [
        { label: "Project Name", desc: "Short title for the project" },
        { label: "Project Description", desc: "Detailed project overview" },
        { label: "Email Address", desc: "Required for communication" },
        { label: "Funding Amount", desc: "Requested funding in USD" },
        { label: "Team Information", desc: "Team members and roles" },
        { label: "Project Links", desc: "Website, GitHub, social media" },
        { label: "Timeline", desc: "Project milestones and dates" },
      ];

      for (const { label, desc } of expectedFields) {
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(desc)).toBeInTheDocument();
      }
    });

    it("displays help text about how to add fields", () => {
      render(<EmptyStateGuidance />);

      expect(screen.getByText(/click field types in the left panel/i)).toBeInTheDocument();
    });

    it("does not show help text when suggestions are hidden", () => {
      render(<EmptyStateGuidance showSuggestions={false} />);

      expect(screen.queryByText(/click field types in the left panel/i)).not.toBeInTheDocument();
    });
  });
});

describe("PostApprovalEmptyState", () => {
  it("renders with post-approval-specific title and description", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.getByText("No Post-Approval Fields Yet")).toBeInTheDocument();
    expect(screen.getByText(/this form is optional/i)).toBeInTheDocument();
    expect(screen.getByText(/bank details, KYC documents/i)).toBeInTheDocument();
  });

  it("does not show suggestions section (overrides showSuggestions=false)", () => {
    render(<PostApprovalEmptyState />);

    expect(screen.queryByText(/suggested fields for grant applications/i)).not.toBeInTheDocument();
  });

  it("passes className through to EmptyStateGuidance", () => {
    const { container } = render(<PostApprovalEmptyState className="post-approval-class" />);

    expect(container.firstChild).toHaveClass("post-approval-class");
  });
});

describe("ReviewersEmptyState", () => {
  it("renders reviewer-specific title and description", () => {
    render(<ReviewersEmptyState />);

    expect(screen.getByText("No Reviewers Added Yet")).toBeInTheDocument();
    expect(
      screen.getByText(/add team members who will help review applications/i)
    ).toBeInTheDocument();
  });

  it("displays the tip about wallet address and ENS name", () => {
    render(<ReviewersEmptyState />);

    expect(screen.getByText(/wallet address or ENS name/i)).toBeInTheDocument();
  });

  it("uses purple theming for the icon container and tip box", () => {
    const { container } = render(<ReviewersEmptyState />);

    expect(container.querySelector(".bg-purple-100")).toBeInTheDocument();
    expect(container.querySelector(".bg-purple-50")).toBeInTheDocument();
  });

  it("passes className through to root element", () => {
    const { container } = render(<ReviewersEmptyState className="reviewer-class" />);

    expect(container.firstChild).toHaveClass("reviewer-class");
  });
});
