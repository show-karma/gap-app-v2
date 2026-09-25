import { fireEvent, render, screen } from "@testing-library/react";
import type { IMilestoneActionItem } from "@/types/funding-platform";

const mockUseMilestoneActionItems = vi.fn();

vi.mock("@/hooks/useMilestoneActionItems", () => ({
  useMilestoneActionItems: (...args: unknown[]) => mockUseMilestoneActionItems(...args),
}));

// DeleteDialog opens a Radix dialog; stub it to a plain trigger so these tests
// stay focused on the list behaviour rather than portal mechanics.
// Spied (not stubbed) so the timezone guard below can assert HOW it is called.
// The vitest config pins TZ=UTC process-wide, so a rendering-based assertion
// cannot distinguish UTC from local — only the argument can.
vi.mock("@/utilities/formatDate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/formatDate")>();
  return { ...actual, formatDate: vi.fn(actual.formatDate) };
});

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({ deleteFunction }: { deleteFunction: () => Promise<void> }) => (
    <button type="button" data-testid="delete-trigger" onClick={() => deleteFunction()}>
      delete
    </button>
  ),
}));

import { MilestoneActionItems } from "@/components/Inbox/MilestoneActionItems";
import { formatDate } from "@/utilities/formatDate";

function makeItem(overrides: Partial<IMilestoneActionItem> = {}): IMilestoneActionItem {
  return {
    id: "item-1",
    milestoneUID: "ms-1",
    grantUID: "grant-1",
    communityUID: "0xcommunity",
    programId: "992",
    content: "Emailed the team",
    followUpAt: null,
    completedAt: null,
    completedByAddress: null,
    createdByAddress: "0xadmin",
    createdByName: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const createItem = vi.fn();
const updateItem = vi.fn();
const deleteItem = vi.fn();

function setHookState(overrides: Record<string, unknown> = {}) {
  mockUseMilestoneActionItems.mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createItem,
    updateItem,
    deleteItem,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    ...overrides,
  });
}

const baseProps = { communityId: "filecoin", milestoneUid: "ms-1" };

beforeEach(() => {
  vi.clearAllMocks();
  setHookState();
});

describe("MilestoneActionItems", () => {
  it("renders a loading state while fetching", () => {
    setHookState({ isLoading: true });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders an error state with a retry affordance", () => {
    setHookState({ error: new Error("boom") });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText(/couldn't load action items/i)).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders an empty state rather than nothing", () => {
    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText(/no action items yet/i)).toBeInTheDocument();
  });

  it("uses the singular noun for one open item", () => {
    setHookState({ items: [makeItem()] });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText("1 open item")).toBeInTheDocument();
  });

  it("uses the plural noun for several open items", () => {
    setHookState({ items: [makeItem(), makeItem({ id: "item-2" })] });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText("2 open items")).toBeInTheDocument();
  });

  it("excludes completed items from the open count", () => {
    setHookState({
      items: [makeItem(), makeItem({ id: "item-2", completedAt: "2026-09-10T00:00:00.000Z" })],
    });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText("1 open item")).toBeInTheDocument();
  });

  it("sends only the desired state when toggling, never a timestamp", () => {
    setHookState({ items: [makeItem()] });

    render(<MilestoneActionItems {...baseProps} />);
    fireEvent.click(screen.getByRole("checkbox"));

    expect(updateItem).toHaveBeenCalledWith({
      id: "item-1",
      input: { completed: true },
    });
  });

  it("reopens a completed item", () => {
    setHookState({
      items: [makeItem({ completedAt: "2026-09-10T00:00:00.000Z" })],
    });

    render(<MilestoneActionItems {...baseProps} />);
    fireEvent.click(screen.getByRole("checkbox"));

    expect(updateItem).toHaveBeenCalledWith({
      id: "item-1",
      input: { completed: false },
    });
  });

  it("creates an item with an ISO follow-up date", () => {
    render(<MilestoneActionItems {...baseProps} />);

    fireEvent.click(screen.getByText("Add"));
    fireEvent.change(screen.getByLabelText("Action item note"), {
      target: { value: "  Called them  " },
    });
    fireEvent.change(screen.getByLabelText(/Next follow-up/), {
      target: { value: "2026-09-25" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(createItem).toHaveBeenCalledWith({
      content: "Called them",
      followUpAt: "2026-09-25T00:00:00.000Z",
    });
  });

  it("requires a follow-up date before creating", () => {
    render(<MilestoneActionItems {...baseProps} />);

    fireEvent.click(screen.getByText("Add"));
    fireEvent.change(screen.getByLabelText("Action item note"), {
      target: { value: "No response" },
    });
    // No follow-up date set: Save is disabled and nothing is submitted.
    fireEvent.click(screen.getByText("Save"));
    expect(createItem).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Next follow-up/), {
      target: { value: "2026-09-25" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(createItem).toHaveBeenCalledWith({
      content: "No response",
      followUpAt: "2026-09-25T00:00:00.000Z",
    });
  });

  it("edits an item's note and follow-up date", () => {
    setHookState({
      items: [
        makeItem({
          id: "ai-1",
          content: "Old note",
          followUpAt: "2026-09-25T00:00:00.000Z",
        }),
      ],
    });
    render(<MilestoneActionItems {...baseProps} />);

    fireEvent.click(screen.getByLabelText("Edit action item"));
    fireEvent.change(screen.getByLabelText("Action item note"), {
      target: { value: "Updated note" },
    });
    fireEvent.change(screen.getByLabelText(/Next follow-up/), {
      target: { value: "2026-10-01" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(updateItem).toHaveBeenCalledWith({
      id: "ai-1",
      input: { content: "Updated note", followUpAt: "2026-10-01T00:00:00.000Z" },
    });
  });

  it("does not submit an empty note", () => {
    render(<MilestoneActionItems {...baseProps} />);

    fireEvent.click(screen.getByText("Add"));
    fireEvent.change(screen.getByLabelText("Action item note"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(createItem).not.toHaveBeenCalled();
  });

  it("flags an overdue follow-up on an open item", () => {
    setHookState({
      items: [makeItem({ followUpAt: "2020-01-01T00:00:00.000Z" })],
    });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.getByText(/follow-up overdue/i)).toBeInTheDocument();
  });

  it("does not flag a follow-up on an item already completed", () => {
    setHookState({
      items: [
        makeItem({
          followUpAt: "2020-01-01T00:00:00.000Z",
          completedAt: "2026-09-10T00:00:00.000Z",
        }),
      ],
    });

    render(<MilestoneActionItems {...baseProps} />);

    expect(screen.queryByText(/follow-up overdue/i)).not.toBeInTheDocument();
  });

  it("routes deletion through a confirmation dialog", () => {
    setHookState({ items: [makeItem()] });

    render(<MilestoneActionItems {...baseProps} />);
    fireEvent.click(screen.getByTestId("delete-trigger"));

    expect(deleteItem).toHaveBeenCalledWith("item-1");
  });
});

/**
 * REGRESSION GUARD (timezone). Follow-up dates are calendar days stored as UTC
 * midnight, and the other timestamps pair with server-computed UTC durations.
 * `formatDate` only auto-coerces bare YYYY-MM-DD strings to UTC, so passing a
 * full ISO timestamp without an explicit "UTC" renders the PREVIOUS day for
 * every viewer west of UTC — which is exactly what shipped until a browser run
 * in America/Los_Angeles caught it.
 */
describe("MilestoneActionItems — timezone-safe date rendering", () => {
  /** Timezone argument formatDate received for a given ISO value. */
  function tzArgFor(iso: string): string | undefined {
    const call = vi.mocked(formatDate).mock.calls.find(([value]) => value === iso);
    return call?.[1];
  }

  it("pins the follow-up date to UTC", () => {
    setHookState({ items: [makeItem({ followUpAt: "2026-09-25T00:00:00.000Z" })] });

    render(<MilestoneActionItems {...baseProps} />);

    expect(tzArgFor("2026-09-25T00:00:00.000Z")).toBe("UTC");
  });

  it("pins the completion date to UTC", () => {
    setHookState({ items: [makeItem({ completedAt: "2026-09-05T00:00:00.000Z" })] });

    render(<MilestoneActionItems {...baseProps} />);

    expect(tzArgFor("2026-09-05T00:00:00.000Z")).toBe("UTC");
  });

  it("pins the created date to UTC", () => {
    setHookState({ items: [makeItem({ createdAt: "2026-09-01T00:00:00.000Z" })] });

    render(<MilestoneActionItems {...baseProps} />);

    expect(tzArgFor("2026-09-01T00:00:00.000Z")).toBe("UTC");
  });
});
