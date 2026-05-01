import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApplicationMilestoneAIEvaluationBadge,
  MilestoneAIEvaluationBadge,
} from "@/components/Milestone/MilestoneAIEvaluationBadge";
import {
  useApplicationMilestoneEvaluation,
  useMilestoneEvaluation,
} from "@/hooks/useMilestoneEvaluation";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

vi.mock("@/hooks/useMilestoneEvaluation", () => ({
  useMilestoneEvaluation: vi.fn(),
  useApplicationMilestoneEvaluation: vi.fn(),
}));

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

  it("renders nothing and skips fetching when completionReason is empty", () => {
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMilestoneEvaluation>);

    render(<MilestoneAIEvaluationBadge milestoneUID="milestone-1" completionReason="" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(useMilestoneEvaluation).toHaveBeenCalledWith("milestone-1", false);
  });

  it("renders nothing and skips fetching when completionReason is whitespace-only", () => {
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMilestoneEvaluation>);

    render(<MilestoneAIEvaluationBadge milestoneUID="milestone-1" completionReason={"   \n  "} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(useMilestoneEvaluation).toHaveBeenCalledWith("milestone-1", false);
  });

  it("fetches and renders when completionReason has content", () => {
    vi.mocked(useMilestoneEvaluation).mockReturnValue({
      data: {
        evaluations: [
          {
            milestoneUID: "milestone-1",
            rating: 6,
            reasoning: "Solid evidence of completion.",
            model: "gpt",
            createdAt: "2026-04-30T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMilestoneEvaluation>);

    render(
      <MilestoneAIEvaluationBadge
        milestoneUID="milestone-1"
        completionReason="Built and shipped feature X"
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("6/10");
    expect(useMilestoneEvaluation).toHaveBeenCalledWith("milestone-1", true);
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

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("9")).toBeInTheDocument();
    expect(within(dialog).queryByText("4")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("No AI evaluation available yet.")).not.toBeInTheDocument();
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

  it("renders nothing and skips fetching when completionReason is empty", () => {
    vi.mocked(useApplicationMilestoneEvaluation).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useApplicationMilestoneEvaluation>);

    render(
      <ApplicationMilestoneAIEvaluationBadge
        referenceNumber="APP-123"
        milestoneTitle="Milestone 1"
        completionReason=""
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(useApplicationMilestoneEvaluation).toHaveBeenCalledWith("APP-123", "Milestone 1", false);
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

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("6")).toBeInTheDocument();
    expect(within(dialog).queryByText("3")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("No AI evaluation available yet.")).not.toBeInTheDocument();
  });
});
