import { fireEvent, render, screen } from "@testing-library/react";
import type { InboxItem } from "@/components/Inbox/types";

// InboxListItem pulls in badges + formatting helpers; stub it to a minimal
// probe so these tests stay focused on the list's toggle/filter behaviour.
vi.mock("@/components/Inbox/InboxListItem", () => ({
  InboxListItem: ({ item }: { item: InboxItem }) => (
    <div data-testid="inbox-item">{item.title}</div>
  ),
}));

import { InboxList } from "@/components/Inbox/InboxList";

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "APP-1",
    kind: "application",
    bucket: "action",
    status: "pending",
    title: "App One",
    programId: "p1",
    activitySort: 0,
    ...overrides,
  };
}

const onSelect = vi.fn();
const onKindFilterChange = vi.fn();

const baseProps = {
  selectedId: undefined,
  onSelect,
  kindFilter: "all" as const,
  onKindFilterChange,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxList kind toggle", () => {
  // hasBothRoles is true for dual-role reviewers AND for community admins
  // (admin access enables both streams), so the toggle must render in both cases.
  it("should_render_kind_toggle_when_user_has_both_streams", () => {
    render(
      <InboxList
        {...baseProps}
        hasBothRoles
        items={[makeItem(), makeItem({ id: "MS-1", kind: "milestone", title: "MS One" })]}
      />
    );

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applications (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestones (1)" })).toBeInTheDocument();
    // The heading names the CONTENT; it used to read "Filter" here.
    expect(screen.getByText("Assigned to you")).toBeInTheDocument();
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("should_hide_kind_toggle_when_user_has_a_single_stream", () => {
    render(<InboxList {...baseProps} hasBothRoles={false} items={[makeItem()]} />);

    expect(screen.queryByRole("button", { name: /Applications \(/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Milestones \(/ })).not.toBeInTheDocument();
    expect(screen.getByText("Assigned to you")).toBeInTheDocument();
  });

  it("should_show_only_milestones_when_kind_filter_is_milestone", () => {
    render(
      <InboxList
        {...baseProps}
        hasBothRoles
        kindFilter="milestone"
        items={[
          makeItem({ title: "App One" }),
          makeItem({ id: "MS-1", kind: "milestone", title: "MS One" }),
        ]}
      />
    );

    expect(screen.getByText("MS One")).toBeInTheDocument();
    expect(screen.queryByText("App One")).not.toBeInTheDocument();
  });

  it("should_call_onKindFilterChange_when_a_toggle_is_clicked", () => {
    render(
      <InboxList
        {...baseProps}
        hasBothRoles
        items={[makeItem(), makeItem({ id: "MS-1", kind: "milestone", title: "MS One" })]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Milestones (1)" }));
    expect(onKindFilterChange).toHaveBeenCalledWith("milestone");
  });
});

describe("InboxList follow-up ordering", () => {
  const adminProps = {
    ...baseProps,
    hasBothRoles: true,
    isCommunityAdmin: true,
  };

  const followUpItems = [
    makeItem({
      id: "MS-1",
      kind: "milestone",
      bucket: "action",
      title: "Overdue chase",
      attentionReason: "invoice_unpaid",
      nextFollowUpAt: "2020-01-01T00:00:00.000Z",
    }),
    makeItem({
      id: "MS-2",
      kind: "milestone",
      bucket: "waiting",
      title: "Undated but ancient",
      attentionReason: "invoice_unpaid",
      nextFollowUpAt: null,
    }),
  ];

  // Under follow-up order the bucket sections give way to next-step groups.
  it("should_group_by_next_step_instead_of_bucket_when_sorted_by_follow_up", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="follow_up_date" />);

    expect(screen.getAllByTestId("inbox-item")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: /needs action/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /by next follow-up/i })).toBeInTheDocument();
  });

  // Undated items sort last however long they have been stuck; the group
  // label is what stops that reading as a broken sort.
  it("should_label_the_items_with_no_follow_up_scheduled", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="follow_up_date" />);

    expect(screen.getByRole("heading", { name: /no follow-up scheduled/i })).toBeInTheDocument();
  });

  it("should_hide_the_unscheduled_group_when_every_item_has_a_follow_up_date", () => {
    render(<InboxList {...adminProps} items={[followUpItems[0]]} sort="follow_up_date" />);

    expect(
      screen.queryByRole("heading", { name: /no follow-up scheduled/i })
    ).not.toBeInTheDocument();
  });

  // Priority ordering keeps the bucket sections it was designed around.
  it("should_keep_bucket_grouping_under_priority_sort", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="priority" />);

    expect(
      screen.queryByRole("heading", { name: /no follow-up scheduled/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /needs attention/i })).toBeInTheDocument();
  });

  // Reviewer-scoped feeds carry no follow-up dates, so the flat mode must not
  // engage for them even if the sort value says otherwise.
  it("should_not_partition_for_a_non_admin_feed", () => {
    render(
      <InboxList
        {...baseProps}
        hasBothRoles={false}
        isCommunityAdmin={false}
        items={followUpItems}
        sort="follow_up_date"
      />
    );

    expect(
      screen.queryByRole("heading", { name: /no follow-up scheduled/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /assigned to you/i })).toBeInTheDocument();
  });
});

describe("InboxList follow-up groups", () => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
  };
  const row = (id: string, nextFollowUpAt?: string): InboxItem => ({
    id,
    kind: "milestone",
    bucket: "action",
    status: "past_due",
    title: id,
    programId: "992",
    activitySort: 0,
    attentionReason: "past_due",
    stageAgeDays: 10,
    ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
  });

  it("should_group_an_admin_queue_by_the_next_follow_up", () => {
    render(
      <InboxList
        items={[
          row("late", day(-3)),
          row("today", day(0)),
          row("week", day(4)),
          row("later", day(20)),
          row("none"),
        ]}
        onSelect={vi.fn()}
        hasBothRoles
        isCommunityAdmin
        kindFilter="all"
        onKindFilterChange={vi.fn()}
        sort="follow_up_date"
      />
    );

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Follow-up overdue",
      "Follow up today",
      "Follow up this week",
      "Follow up later",
      "No follow-up scheduled",
    ]);
  });
});
