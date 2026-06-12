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
    expect(screen.getByText("Filter")).toBeInTheDocument();
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
