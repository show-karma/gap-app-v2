import { render, screen } from "@testing-library/react";
import {
  ApplicationMilestoneAIEvaluationBadge,
  MilestoneAIEvaluationBadge,
} from "@/components/Milestone/MilestoneAIEvaluationBadge";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

vi.mock("@/hooks/useMilestoneEvaluation", () => ({
  useMilestoneEvaluation: vi.fn(),
  useApplicationMilestoneEvaluation: vi.fn(),
}));

const { useApplicationMilestoneEvaluation, useMilestoneEvaluation } = await import(
  "@/hooks/useMilestoneEvaluation"
);

describe("MilestoneAIEvaluationBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the badge when milestone evaluations are missing AI evaluation data", () => {
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 2,
            reasoning: "",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useMilestoneEvaluation>);

    render(<MilestoneAIEvaluationBadge milestoneUID="milestone-1" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("2/10")).not.toBeInTheDocument();
  });

  it("renders the badge when milestone evaluations include valid AI evaluation data", () => {
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 8,
            reasoning: "Strong evidence and clear completion details.",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useMilestoneEvaluation>);

    render(<MilestoneAIEvaluationBadge milestoneUID="milestone-1" />);

    expect(screen.getByRole("button")).toHaveTextContent("8/10");
  });
});

describe("ApplicationMilestoneAIEvaluationBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the badge when application milestone evaluations are missing AI evaluation data", () => {
    vi.mocked(useApplicationMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 2,
            reasoning: "   ",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useApplicationMilestoneEvaluation>);

    render(
      <ApplicationMilestoneAIEvaluationBadge
        referenceNumber="APP-123"
        milestoneTitle="Milestone 1"
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("2/10")).not.toBeInTheDocument();
  });

  it("renders the badge when application milestone evaluations include valid AI evaluation data", () => {
    vi.mocked(useApplicationMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 7,
            reasoning: "The completion includes concrete proof of work.",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useApplicationMilestoneEvaluation>);

    render(
      <ApplicationMilestoneAIEvaluationBadge
        referenceNumber="APP-123"
        milestoneTitle="Milestone 1"
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("7/10");
  });
});
