import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReviewPanel } from "@/components/Pages/OnboardingAssistant/ReviewPanel";
import type { OnboardingData } from "@/components/Pages/OnboardingAssistant/types";

const completeData: OnboardingData = {
  type: "onboarding_data",
  project: {
    title: "Test Project",
    description: "A full project description",
    problem: "The problem we solve",
    solution: "Our approach to solving it",
    missionSummary: "Building a better world",
    locationOfImpact: "Global",
    businessModel: "SaaS",
    stageIn: "Growth",
    raisedMoney: "$1M",
    pathToTake: "Expand globally",
    links: {
      twitter: "testproject",
      github: "test-org",
      website: "https://testproject.com",
    },
  },
  grants: [
    {
      title: "Gitcoin Grant",
      amount: "$50,000",
      community: "Gitcoin",
      milestones: [
        { title: "MVP Launch", description: "Launch the MVP" },
        { title: "User Testing", description: "Complete user testing" },
      ],
    },
  ],
};

const incompleteData: OnboardingData = {
  type: "onboarding_data",
  project: {
    title: "Test Project",
    description: "A description",
    problem: "",
    solution: "",
    missionSummary: "",
  },
  grants: [],
};

describe("ReviewPanel", () => {
  const mockOnEdit = jest.fn();
  const mockOnCreateProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering with complete data", () => {
    it("should render project details section", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.getByText("Project Details")).toBeInTheDocument();
      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText("A full project description")).toBeInTheDocument();
    });

    it("should render links section", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.getByText("Links")).toBeInTheDocument();
      expect(screen.getByText("testproject")).toBeInTheDocument();
      expect(screen.getByText("test-org")).toBeInTheDocument();
    });

    it("should render grants section with count", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.getByText("Grants (1)")).toBeInTheDocument();
      expect(screen.getByText("Gitcoin Grant")).toBeInTheDocument();
      expect(screen.getByText("$50,000")).toBeInTheDocument();
    });

    it("should render milestones within grants", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.getByText("Milestones (2)")).toBeInTheDocument();
      expect(screen.getByText("MVP Launch")).toBeInTheDocument();
      expect(screen.getByText("User Testing")).toBeInTheDocument();
    });

    it("should enable Create Project button when all required fields present", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      const createButton = screen.getByText("Create Project");
      expect(createButton).not.toBeDisabled();
    });
  });

  describe("rendering with incomplete data", () => {
    it("should show required field warnings", () => {
      render(
        <ReviewPanel
          data={incompleteData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      const requiredLabels = screen.getAllByText("*required");
      expect(requiredLabels.length).toBeGreaterThan(0);
    });

    it("should disable Create Project button when required fields missing", () => {
      render(
        <ReviewPanel
          data={incompleteData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      const createButton = screen.getByText("Create Project");
      expect(createButton).toBeDisabled();
    });

    it("should show missing fields message", () => {
      render(
        <ReviewPanel
          data={incompleteData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.getByText(/Some required fields are missing/)).toBeInTheDocument();
    });

    it("should not render grants section when no grants", () => {
      render(
        <ReviewPanel
          data={incompleteData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      expect(screen.queryByText(/Grants/)).not.toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onEdit when Back to Chat clicked", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      fireEvent.click(screen.getByText("Back to Chat"));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it("should call onCreateProject when Create Project clicked", () => {
      render(
        <ReviewPanel
          data={completeData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      fireEvent.click(screen.getByText("Create Project"));
      expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
    });

    it("should not call onCreateProject when disabled", () => {
      render(
        <ReviewPanel
          data={incompleteData}
          onEdit={mockOnEdit}
          onCreateProject={mockOnCreateProject}
        />
      );

      fireEvent.click(screen.getByText("Create Project"));
      expect(mockOnCreateProject).not.toHaveBeenCalled();
    });
  });
});
