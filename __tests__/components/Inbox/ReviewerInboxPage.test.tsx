import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewerInboxPage } from "@/components/Inbox/ReviewerInboxPage";
import type { InboxItem, InboxStats } from "@/components/Inbox/types";
import type { Community } from "@/types/v2/community";

// --- Dependency mocks: keep the test focused on the selection/history logic ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, ready: true }),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({ isLoading: false }),
  useIsReviewerType: () => true, // milestone + program reviewer → authorized
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: () => ({ hasAccess: false, isLoading: false }),
}));

const mockStats: InboxStats = { action: 2, waiting: 0, done: 0 };
let mockItems: InboxItem[] = [];
vi.mock("@/components/Inbox/useInboxFeed", () => ({
  useInboxFeed: () => ({
    items: mockItems,
    stats: mockStats,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Heavy detail panes → light stubs so the milestone detail is observable.
vi.mock("@/components/Inbox/InboxMilestoneDetail", () => ({
  InboxMilestoneDetail: ({ milestoneUid }: { milestoneUid: string }) => (
    <div>MILESTONE DETAIL {milestoneUid}</div>
  ),
}));
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationDetailView", () => ({
  default: () => <div>APPLICATION DETAIL</div>,
}));

const milestone = (n: number): InboxItem => ({
  id: `m-${n}`,
  kind: "milestone",
  bucket: "action",
  status: "pending",
  title: `Milestone ${n}`,
  project: "Optimism Season 8",
  programId: "prog-1",
  activitySort: n,
  projectUid: `proj-${n}`,
  grantUid: `grant-${n}`,
  milestoneUid: `mu-${n}`,
});

const community = {
  uid: "c1",
  details: { slug: "octant", name: "Octant" },
} as unknown as Community;

describe("ReviewerInboxPage selection ↔ URL hash", () => {
  beforeEach(() => {
    mockItems = [milestone(1), milestone(2)];
    window.history.replaceState({}, "", "/community/octant/manage/action-items");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes a history entry when opening the first item so browser Back returns to the list", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    render(<ReviewerInboxPage community={community} />);

    fireEvent.click(screen.getByRole("button", { name: /Milestone 1/i }));

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("#review-m-1");
    expect(screen.getByText(/MILESTONE DETAIL mu-1/)).toBeInTheDocument();
  });

  it("replaces the entry when switching items so the history stack isn't spammed", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    render(<ReviewerInboxPage community={community} />);

    fireEvent.click(screen.getByRole("button", { name: /Milestone 1/i }));
    replaceSpy.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Milestone 2/i }));

    // One push (first open) + a replace on the switch — not a second push.
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("#review-m-2");
  });

  it("clears the selection when the browser navigates back off the hash", async () => {
    render(<ReviewerInboxPage community={community} />);
    fireEvent.click(screen.getByRole("button", { name: /Milestone 1/i }));
    expect(screen.getByText(/MILESTONE DETAIL mu-1/)).toBeInTheDocument();

    // Simulate browser Back: the pushed hash is popped and hashchange fires.
    window.history.replaceState({}, "", window.location.pathname);
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    await waitFor(() =>
      expect(screen.queryByText(/MILESTONE DETAIL mu-1/)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Select an item on the left to start reviewing/i)).toBeInTheDocument();
  });

  it("never touches the URL hash when syncSelectionToHash is disabled (dashboard host owns it)", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    render(<ReviewerInboxPage community={community} syncSelectionToHash={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Milestone 1/i }));

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    // Selection is still pure component state — the detail renders.
    expect(screen.getByText(/MILESTONE DETAIL mu-1/)).toBeInTheDocument();
  });
});
