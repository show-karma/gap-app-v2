import { render, screen } from "@testing-library/react";
import {
  FollowUpTimeline,
  groupByDay,
} from "@/components/FundingPlatform/FollowUp/FollowUpTimeline";

const caseResult = { current: undefined as unknown };
vi.mock("@/hooks/useFollowUpCases", () => ({
  useFollowUpCase: () => caseResult.current,
}));

const log = [
  {
    at: "2026-11-17T10:00:00.000Z",
    kind: "event",
    text: "The grantee marked the milestone as completed.",
  },
  { at: "2026-11-17T10:01:00.000Z", kind: "message_queued", text: "Message to Bruno queued." },
  {
    at: "2026-11-18T21:11:00.000Z",
    kind: "escalated",
    text: "Asked the operator about the credential.",
  },
];

describe("groupByDay", () => {
  it("groups consecutive entries of the same day", () => {
    const groups = groupByDay(log);

    expect(groups.map((g) => g.entries.length)).toEqual([2, 1]);
  });

  it("merges identical consecutive entries into one with a count", () => {
    const draft = {
      at: "2026-11-17T10:02:00.000Z",
      kind: "verdict_submitted",
      text: "Saved a Sim verdict draft (revision 1).",
    };

    const [day] = groupByDay([draft, draft, draft]);

    expect(day.entries).toEqual([{ entry: draft, count: 3 }]);
  });
});

describe("FollowUpTimeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows skeleton while loading", () => {
    caseResult.current = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };

    const { container } = render(<FollowUpTimeline programId="101105" milestoneUid="0x1" />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("shows retry on error", () => {
    caseResult.current = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };

    render(<FollowUpTimeline programId="101105" milestoneUid="0x1" />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows empty state when there is no activity", () => {
    caseResult.current = { data: null, isLoading: false, isError: false, refetch: vi.fn() };

    render(<FollowUpTimeline programId="101105" milestoneUid="0x1" />);

    expect(screen.getByText("No activity for this milestone yet.")).toBeInTheDocument();
  });

  it("renders every entry with its kind label and the needs-you notice", () => {
    caseResult.current = {
      data: {
        milestoneUid: "0x1",
        milestoneTitle: "Basics",
        referenceNumber: "APP-1",
        stage: "waiting_operator",
        needsOperator: true,
        closedAt: null,
        updatedAt: log[2].at,
        lastEntry: log[2],
        entryCount: 3,
        log,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<FollowUpTimeline programId="101105" milestoneUid="0x1" />);

    expect(screen.getByText("Message sent")).toBeInTheDocument();
    expect(screen.getAllByText("Needs you").length).toBeGreaterThan(0);
    expect(screen.getByText(/Reply there and it picks up from your answer/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
