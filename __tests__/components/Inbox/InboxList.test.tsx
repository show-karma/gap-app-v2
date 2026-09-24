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

  // Re-grouping a global date order into buckets scatters it across three
  // sections, leaving an order the reader cannot follow.
  it("should_render_a_flat_list_without_bucket_headings_when_sorted_by_follow_up", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="follow_up_date" />);

    expect(screen.getAllByTestId("inbox-item")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: /needs action/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /overdue follow-ups first/i })).toBeInTheDocument();
  });

  // Undated items sort last however long they have been stuck; the divider is
  // what stops that reading as a broken sort.
  it("should_mark_where_the_follow_up_dates_run_out", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="follow_up_date" />);

    const divider = screen.getByRole("heading", { name: /no follow-up set/i });
    expect(divider).toBeInTheDocument();
  });

  it("should_hide_the_divider_when_every_item_has_a_follow_up_date", () => {
    render(<InboxList {...adminProps} items={[followUpItems[0]]} sort="follow_up_date" />);

    expect(screen.queryByRole("heading", { name: /no follow-up set/i })).not.toBeInTheDocument();
  });

  // Priority ordering keeps the bucket sections it was designed around.
  it("should_keep_bucket_grouping_under_priority_sort", () => {
    render(<InboxList {...adminProps} items={followUpItems} sort="priority" />);

    expect(screen.queryByRole("heading", { name: /no follow-up set/i })).not.toBeInTheDocument();
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

    expect(screen.queryByRole("heading", { name: /no follow-up set/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /assigned to you/i })).toBeInTheDocument();
  });
});
