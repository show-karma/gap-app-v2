import { renderHook } from "@testing-library/react";
import type { InboxItem, InboxStats } from "@/components/Inbox/types";

const mockUseReviewerInbox = vi.fn();

vi.mock("@/hooks/useReviewerInbox", () => ({
  useReviewerInbox: (...args: unknown[]) => mockUseReviewerInbox(...args),
}));

import { type UseInboxFeedOptions, useInboxFeed } from "@/components/Inbox/useInboxFeed";

function makeAppItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "APP-A",
    kind: "application",
    bucket: "action",
    status: "pending",
    title: "Alice Project",
    who: "alice@example.com",
    programId: "prog-1",
    chainID: 1,
    aiScore: 87,
    activitySort: new Date("2026-06-01T00:00:00Z").getTime(),
    referenceNumber: "APP-A",
    ...overrides,
  };
}

function makeMilestoneItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "ms-1",
    kind: "milestone",
    bucket: "action",
    status: "completed",
    title: "Milestone One",
    project: "Project One",
    subtitle: "Grant One",
    programId: "prog-2",
    overdue: false,
    activitySort: new Date("2026-05-01T00:00:00Z").getTime(),
    projectUid: "proj-1",
    grantUid: "grant-1",
    projectSlug: "project-one",
    milestoneUid: "ms-1",
    ...overrides,
  };
}

const EMPTY_STATS: InboxStats = {
  action: 0,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 0,
  milestones: 0,
};

function setFeed({
  items = [] as InboxItem[],
  stats = EMPTY_STATS,
  isLoading = false,
  error = null as Error | null,
} = {}) {
  mockUseReviewerInbox.mockReturnValue({
    items,
    pagination: null,
    stats,
    isLoading,
    isFetching: false,
    error,
    refetch: vi.fn(),
  });
}

const baseOptions: UseInboxFeedOptions = {
  communityId: "octant",
  includeApplications: true,
  includeMilestones: true,
};

function render(options: Partial<UseInboxFeedOptions> = {}) {
  return renderHook(() => useInboxFeed({ ...baseOptions, ...options }));
}

describe("useInboxFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the server-provided items and stats unchanged", () => {
    const items = [makeAppItem(), makeMilestoneItem()];
    const stats: InboxStats = {
      action: 2,
      waiting: 0,
      done: 0,
      overdue: 0,
      applications: 1,
      milestones: 1,
    };
    setFeed({ items, stats });

    const { result } = render();

    expect(result.current.items).toBe(items);
    expect(result.current.stats).toBe(stats);
  });

  it("forwards the application filters to useReviewerInbox", () => {
    setFeed();
    const applicationFilters = { status: "pending", page: 2 };

    render({ applicationFilters });

    expect(mockUseReviewerInbox).toHaveBeenCalledWith(
      "octant",
      applicationFilters,
      expect.objectContaining({ enabled: true })
    );
  });

  it("enables the query when only applications are included", () => {
    setFeed();
    render({ includeApplications: true, includeMilestones: false });
    expect(mockUseReviewerInbox.mock.calls.at(-1)?.[2]).toMatchObject({ enabled: true });
  });

  it("enables the query when only milestones are included", () => {
    setFeed();
    render({ includeApplications: false, includeMilestones: true });
    expect(mockUseReviewerInbox.mock.calls.at(-1)?.[2]).toMatchObject({ enabled: true });
  });

  it("disables the query when neither stream is included", () => {
    setFeed();
    render({ includeApplications: false, includeMilestones: false });
    expect(mockUseReviewerInbox.mock.calls.at(-1)?.[2]).toMatchObject({ enabled: false });
  });

  it("reports loading from the feed", () => {
    setFeed({ isLoading: true });
    const { result } = render();
    expect(result.current.isLoading).toBe(true);
  });

  it("surfaces the feed error", () => {
    const boom = new Error("inbox failed");
    setFeed({ error: boom });
    const { result } = render();
    expect(result.current.error).toBe(boom);
  });
});
