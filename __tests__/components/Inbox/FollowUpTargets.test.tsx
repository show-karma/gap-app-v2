import { fireEvent, render, screen } from "@testing-library/react";
import type { FollowUpTarget } from "@/types/follow-up-target";
import type { IMilestoneActionItem } from "@/types/funding-platform";

const followUpMocks = vi.hoisted(() => ({
  suggest: { mutate: vi.fn(), isPending: false, isError: false },
  set: { mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() },
}));

vi.mock("@/hooks/useFollowUpTargets", () => ({
  useFollowUpTargets: () => followUpMocks,
}));

vi.mock("@/components/Inbox/FollowUpTargetDialog", () => ({
  FollowUpTargetDialog: ({ replaceIndex }: { replaceIndex: number }) => (
    <div data-testid="target-dialog">editing {replaceIndex}</div>
  ),
}));

import { FollowUpTargets } from "@/components/Inbox/FollowUpTargets";

const slack = { status: "connected" as const, settingsHref: "/settings" };
const target = { kind: "milestone" as const, id: "ms-1" };

function makeItem(
  followUpTargets: FollowUpTarget[],
  overrides: Partial<IMilestoneActionItem> = {}
): IMilestoneActionItem {
  return {
    id: "item-1",
    milestoneUID: "ms-1",
    grantUID: "grant-1",
    applicationReference: null,
    communityUID: "0xcommunity",
    programId: "992",
    content: "Waiting on Bruno",
    followUpAt: "2026-11-20T00:00:00.000Z",
    autoFollowUp: true,
    followUpTargets,
    completedAt: null,
    completedByAddress: null,
    createdByAddress: "0xadmin",
    createdByName: "Erin",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("FollowUpTargets", () => {
  beforeEach(() => {
    followUpMocks.suggest.mutate.mockClear();
    followUpMocks.suggest.isError = false;
  });

  it("asks for a suggestion once when a saved note has no destination yet", () => {
    const item = makeItem([]);
    const { rerender } = render(
      <FollowUpTargets communityId="filecoin" target={target} item={item} slack={slack} />
    );
    rerender(<FollowUpTargets communityId="filecoin" target={target} item={item} slack={slack} />);

    expect(followUpMocks.suggest.mutate).toHaveBeenCalledTimes(1);
    expect(followUpMocks.suggest.mutate).toHaveBeenCalledWith("item-1");
    expect(screen.getByText("Finding who to message…")).toBeInTheDocument();
  });

  it("does not suggest for an optimistic placeholder", () => {
    render(
      <FollowUpTargets
        communityId="filecoin"
        target={target}
        item={makeItem([], { id: "optimistic-2026" })}
        slack={slack}
      />
    );

    expect(followUpMocks.suggest.mutate).not.toHaveBeenCalled();
  });

  it("shows the suggested person and opens the picker on change", () => {
    render(
      <FollowUpTargets
        communityId="filecoin"
        target={target}
        item={makeItem([
          {
            kind: "dm",
            teamId: "T1",
            slackUserId: "U1",
            displayName: "Bruno De Masi",
            personName: "Bruno",
            source: "suggested",
          },
        ])}
        slack={slack}
      />
    );

    expect(followUpMocks.suggest.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /currently Bruno De Masi/ }));
    expect(screen.getByTestId("target-dialog")).toHaveTextContent("editing 0");
  });

  it("flags an unresolved recipient as needing a choice", () => {
    render(
      <FollowUpTargets
        communityId="filecoin"
        target={target}
        item={makeItem([
          {
            kind: "unresolved",
            reason: "ambiguous",
            candidates: ["Bruno", "Bruno2"],
            personName: "Bruno",
            source: "suggested",
          },
        ])}
        slack={slack}
      />
    );

    expect(screen.getByRole("button", { name: /Choose who receives/ })).toHaveTextContent(
      "Bruno: 2 matches"
    );
  });

  it("points to Slack settings when the author is not connected", () => {
    render(
      <FollowUpTargets
        communityId="filecoin"
        target={target}
        item={makeItem([
          {
            kind: "unresolved",
            reason: "author_not_connected",
            candidates: [],
            source: "suggested",
          },
        ])}
        slack={slack}
      />
    );

    expect(screen.getByRole("link", { name: "Connect your Slack" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });
});
