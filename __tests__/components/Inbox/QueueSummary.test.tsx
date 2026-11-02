import { fireEvent, render, screen } from "@testing-library/react";
import { QueueSummary } from "@/components/Inbox/QueueSummary";

const mockUseQueueSummary = vi.fn();
vi.mock("@/hooks/useQueueSummary", () => ({
  useQueueSummary: (...args: unknown[]) => mockUseQueueSummary(...args),
}));

const target = { kind: "milestone" as const, id: "ms-1" };

const state = (overrides: Record<string, unknown> = {}) => ({
  summary: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  refresh: vi.fn(),
  isRefreshing: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("QueueSummary", () => {
  it("should_show_a_skeleton_while_the_brief_is_written", () => {
    mockUseQueueSummary.mockReturnValue(state({ isLoading: true }));

    render(<QueueSummary communityId="filecoin" target={target} />);

    expect(screen.getByRole("region", { name: "AI summary" })).toHaveTextContent("");
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("should_show_the_brief_and_when_it_was_written", () => {
    mockUseQueueSummary.mockReturnValue(
      state({
        summary: {
          summary: "The team has not replied since 1 March.",
          followUp: null,
          generatedAt: "2024-03-10T12:00:00.000Z",
          cached: true,
        },
      })
    );

    render(<QueueSummary communityId="filecoin" target={target} />);

    expect(screen.getByText("The team has not replied since 1 March.")).toBeInTheDocument();
    expect(screen.getByText(/AI summary from the timeline/)).toBeInTheDocument();
  });

  it("should_offer_the_suggested_follow_up_to_copy_and_to_log", () => {
    mockUseQueueSummary.mockReturnValue(
      state({
        summary: {
          summary: "Delivery is still owed.",
          followUp: {
            to: "the grantee",
            message: "Hi, could you share a date for Milestone 3?",
            note: "Asked the grantee for a delivery date on Milestone 3.",
            followUpAt: "2024-03-13",
          },
          generatedAt: "2024-03-10T12:00:00.000Z",
          cached: false,
        },
      })
    );
    const drafts: unknown[] = [];
    window.addEventListener("inbox:note-draft", (event) =>
      drafts.push((event as CustomEvent).detail)
    );

    render(<QueueSummary communityId="filecoin" target={target} />);

    expect(screen.getByText(/Suggested follow-up/)).toBeInTheDocument();
    expect(screen.getByText(/to the grantee/)).toBeInTheDocument();
    expect(screen.getByText("Hi, could you share a date for Milestone 3?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use as note" }));
    expect(drafts).toEqual([
      {
        content: "Asked the grantee for a delivery date on Milestone 3.",
        followUpAt: "2024-03-13",
      },
    ]);
  });

  it("should_show_only_the_brief_when_there_is_nothing_to_chase", () => {
    mockUseQueueSummary.mockReturnValue(
      state({
        summary: {
          summary: "All clear.",
          followUp: null,
          generatedAt: "2024-03-10T12:00:00.000Z",
          cached: false,
        },
      })
    );

    render(<QueueSummary communityId="filecoin" target={target} />);

    expect(screen.queryByText(/Suggested follow-up/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy message" })).not.toBeInTheDocument();
  });

  it("should_offer_a_retry_on_error", () => {
    const refetch = vi.fn();
    mockUseQueueSummary.mockReturnValue(state({ error: new Error("boom"), refetch }));

    render(<QueueSummary communityId="filecoin" target={target} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("should_rewrite_on_demand", () => {
    const refresh = vi.fn();
    mockUseQueueSummary.mockReturnValue(
      state({
        summary: {
          summary: "Old brief.",
          followUp: null,
          generatedAt: "2024-03-01T00:00:00.000Z",
          cached: true,
        },
        refresh,
      })
    );

    render(<QueueSummary communityId="filecoin" target={target} />);

    fireEvent.click(screen.getByRole("button", { name: "Regenerate summary" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("should_not_write_anything_until_asked", () => {
    mockUseQueueSummary.mockReturnValue(state());

    render(<QueueSummary communityId="filecoin" target={target} />);

    expect(mockUseQueueSummary).toHaveBeenLastCalledWith("filecoin", target, { enabled: false });
    expect(screen.queryByRole("button", { name: "Regenerate summary" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    expect(mockUseQueueSummary).toHaveBeenLastCalledWith("filecoin", target, { enabled: true });
  });

  it("should_stay_off_when_the_caller_disables_it", () => {
    mockUseQueueSummary.mockReturnValue(state());

    render(<QueueSummary communityId="filecoin" target={target} enabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    expect(mockUseQueueSummary).toHaveBeenLastCalledWith("filecoin", target, { enabled: false });
  });
});
