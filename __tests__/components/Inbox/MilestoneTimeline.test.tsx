import { render, screen } from "@testing-library/react";
import type { IMilestoneTimeline } from "@/types/funding-platform";

const mockUseMilestoneAdminTimeline = vi.fn();

// Spied so the timezone guard can assert HOW it is called — the vitest config
// pins TZ=UTC, so rendering alone cannot distinguish UTC from local.
vi.mock("@/utilities/formatDate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/formatDate")>();
  return { ...actual, formatDate: vi.fn(actual.formatDate) };
});

vi.mock("@/hooks/useMilestoneAdminTimeline", () => ({
  useMilestoneAdminTimeline: (...args: unknown[]) => mockUseMilestoneAdminTimeline(...args),
}));

import { MilestoneTimeline } from "@/components/Inbox/MilestoneTimeline";
import { formatDate } from "@/utilities/formatDate";

function makeTimeline(overrides: Partial<IMilestoneTimeline> = {}): IMilestoneTimeline {
  return {
    milestoneUid: "ms-1",
    milestoneTitle: "Monthly Payment",
    grantUid: "grant-1",
    grantTitle: "Grant One",
    projectUid: "project-1",
    projectTitle: "Project One",
    projectSlug: "project-one",
    programId: "992",
    currentStatus: "verified",
    dueDate: "2026-08-01T00:00:00.000Z",
    attentionReason: "invoice_unpaid",
    stageAgeDays: 35,
    events: [],
    stageDurations: {
      toDeliveryDays: null,
      inReviewDays: null,
      toInvoiceDays: null,
      toPaymentDays: null,
    },
    invoice: null,
    ...overrides,
  };
}

function setHookState(overrides: Record<string, unknown> = {}) {
  mockUseMilestoneAdminTimeline.mockReturnValue({
    timeline: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

const baseProps = { communityId: "filecoin", milestoneUid: "ms-1" };

beforeEach(() => {
  vi.clearAllMocks();
  setHookState();
});

describe("MilestoneTimeline", () => {
  it("renders a loading state while fetching", () => {
    setHookState({ isLoading: true });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders an error state with a retry affordance", () => {
    setHookState({ error: new Error("boom") });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByText(/couldn't load this milestone's timeline/i)).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders an empty state rather than nothing when there are no events", () => {
    setHookState({ timeline: makeTimeline() });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByText(/no lifecycle events recorded/i)).toBeInTheDocument();
  });

  it("renders the events the server supplied, in order", () => {
    setHookState({
      timeline: makeTimeline({
        events: [
          { type: "completed", at: "2026-08-02T00:00:00.000Z" },
          { type: "verified", at: "2026-08-09T00:00:00.000Z" },
          { type: "invoice_received", at: "2026-08-14T00:00:00.000Z" },
        ],
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    const labels = screen.getAllByText(/update submitted|verified|invoice received/i);
    expect(labels[0]).toHaveTextContent("Update submitted");
    expect(labels[1]).toHaveTextContent("Verified");
    expect(labels[2]).toHaveTextContent("Invoice received");
  });

  it("shows the attention reason badge", () => {
    setHookState({
      timeline: makeTimeline({
        events: [{ type: "completed", at: "2026-08-02T00:00:00.000Z" }],
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByText("Invoice unpaid")).toBeInTheDocument();
  });

  it("omits stage durations entirely when no stage has been reached", () => {
    setHookState({
      timeline: makeTimeline({
        events: [{ type: "created", at: "2026-08-01T00:00:00.000Z" }],
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.queryByText("To delivery")).not.toBeInTheDocument();
  });

  it("renders only the stage durations that have a value", () => {
    setHookState({
      timeline: makeTimeline({
        events: [{ type: "completed", at: "2026-08-02T00:00:00.000Z" }],
        stageDurations: {
          toDeliveryDays: 12,
          inReviewDays: 7,
          toInvoiceDays: null,
          toPaymentDays: null,
        },
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByText("To delivery")).toBeInTheDocument();
    expect(screen.getByText("12d")).toBeInTheDocument();
    expect(screen.queryByText("To invoice")).not.toBeInTheDocument();
  });

  it("shows the actor on an event that records one", () => {
    setHookState({
      timeline: makeTimeline({
        events: [
          {
            type: "verified",
            at: "2026-08-09T00:00:00.000Z",
            actor: "0x1234567890abcdef1234567890abcdef12345678",
          },
        ],
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    expect(screen.getByText(/0x1234\.\.\.345678/)).toBeInTheDocument();
  });
});

/**
 * REGRESSION GUARD (timezone). The server computes stage durations in UTC, so
 * event timestamps must render in UTC too — otherwise the timeline contradicts
 * its own durations and a date-only label west of UTC lands a day early.
 */
describe("MilestoneTimeline — timezone-safe date rendering", () => {
  it("pins event timestamps to UTC", () => {
    setHookState({
      timeline: makeTimeline({
        events: [{ type: "verified", at: "2026-06-28T00:00:00.000Z" }],
      }),
    });

    render(<MilestoneTimeline {...baseProps} />);

    const call = vi
      .mocked(formatDate)
      .mock.calls.find(([value]) => value === "2026-06-28T00:00:00.000Z");
    expect(call?.[1]).toBe("UTC");
  });
});
