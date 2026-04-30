import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("modal filters out invalid evaluations and renders only valid ones", async () => {
    const user = userEvent.setup();
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 9,
            reasoning: "Comprehensive evidence supporting completion.",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
          {
            milestoneUID: "milestone-1",
            rating: 4,
            reasoning: "",
            model: "claude",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMilestoneEvaluation>);

    render(<MilestoneAIEvaluationBadge milestoneUID="milestone-1" />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(screen.queryByText("No AI evaluation available yet.")).not.toBeInTheDocument();
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

  it("modal filters out invalid evaluations and renders only valid ones", async () => {
    const user = userEvent.setup();
    vi.mocked(useApplicationMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 6,
            reasoning: "The submission demonstrates measurable progress.",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
          {
            milestoneUID: "milestone-1",
            rating: 3,
            reasoning: "   ",
            model: "claude",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useApplicationMilestoneEvaluation>);

    render(
      <ApplicationMilestoneAIEvaluationBadge
        referenceNumber="APP-123"
        milestoneTitle="Milestone 1"
      />
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.queryByText("No AI evaluation available yet.")).not.toBeInTheDocument();
  });
});
