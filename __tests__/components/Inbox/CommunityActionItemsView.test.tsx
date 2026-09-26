import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityActionItemsView } from "@/components/Inbox/CommunityActionItemsView";

const query = vi.hoisted(() => vi.fn());
const detail = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useCommunityActionItems", () => ({ useCommunityActionItems: query }));
vi.mock("@/components/Inbox/InboxMilestoneDetail", () => ({
  InboxMilestoneDetail: (props: object) => {
    detail(props);
    return <div data-testid="milestone-detail" />;
  },
}));

describe("CommunityActionItemsView", () => {
  beforeEach(() => {
    query.mockReset();
    detail.mockClear();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
  });

  it("opens the selected item's milestone and resets selection with filters", () => {
    query.mockImplementation(() => ({
      data: {
        items: [
          {
            id: "item-1",
            content: "Follow up with grantee",
            programId: "123_42161",
            grantUID: "grant-1",
            projectUid: "project-1",
            projectTitle: "Community Project",
            milestoneUID: "milestone-1",
            milestoneTitle: "First report",
            followUpAt: null,
            completedAt: null,
          },
        ],
        pagination: { page: 1, limit: 25, total: 30, totalPages: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = render(
      <CommunityActionItemsView
        communityId="community-1"
        programId="123"
        projectUid="project-1"
        active
      />
    );

    expect(
      screen.getByText("Select an action item on the left to view its milestone.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Follow up with grantee/ }));
    expect(screen.getByTestId("milestone-detail")).toBeInTheDocument();
    expect(detail.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        showAdminTools: true,
        projectUid: "project-1",
        programId: "123_42161",
        grantUid: "grant-1",
        milestoneUid: "milestone-1",
        communityId: "community-1",
      })
    );
    expect(query).toHaveBeenLastCalledWith(
      "community-1",
      {
        page: 1,
        status: "all",
        programId: "123",
        projectUid: "project-1",
      },
      true
    );

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.queryByTestId("milestone-detail")).not.toBeInTheDocument();
    expect(query).toHaveBeenLastCalledWith(
      "community-1",
      {
        page: 1,
        status: "completed",
        programId: "123",
        projectUid: "project-1",
      },
      true
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(query).toHaveBeenLastCalledWith(
      "community-1",
      {
        page: 2,
        status: "completed",
        programId: "123",
        projectUid: "project-1",
      },
      true
    );

    rerender(
      <CommunityActionItemsView
        communityId="community-1"
        programId="123"
        projectUid="project-2"
        active
      />
    );
    expect(query).toHaveBeenLastCalledWith(
      "community-1",
      {
        page: 1,
        status: "completed",
        programId: "123",
        projectUid: "project-2",
      },
      true
    );
    expect(screen.queryByTestId("milestone-detail")).not.toBeInTheDocument();
  });

  it("explains when a selected action item's milestone cannot be resolved", () => {
    query.mockReturnValue({
      data: {
        items: [
          {
            id: "item-2",
            content: "Confirm invoice",
            programId: null,
            projectUid: null,
            projectTitle: null,
            milestoneUID: "milestone-2",
            milestoneTitle: null,
            followUpAt: null,
            completedAt: null,
          },
        ],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <CommunityActionItemsView
        communityId="community-1"
        programId={null}
        projectUid={null}
        active
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm invoice/ }));
    expect(screen.getByText(/project or program is unavailable/)).toBeInTheDocument();
    expect(detail).not.toHaveBeenCalled();
  });
});
