import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrantMilestoneOptionsMenu } from "@/components/Milestone/GrantMilestoneOptionsMenu";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

const mockMultiGrantDelete = jest.fn();

jest.mock("@/hooks/useMilestone", () => ({
  useMilestone: () => ({
    isDeleting: false,
    multiGrantDelete: mockMultiGrantDelete,
  }),
}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: any) => {
    const Component = (props: any) => (
      <div data-testid="milestone-edit-dialog" data-is-open={props.isOpen}>
        MockMilestoneEditDialog
      </div>
    );
    Component.displayName = "DynamicComponent";
    return Component;
  },
}));

jest.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({ title, buttonElement }: any) => (
    <button data-testid="delete-button">{buttonElement.text}</button>
  ),
}));

jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: () => <span data-testid="check-icon" />,
  EllipsisVerticalIcon: () => <span data-testid="ellipsis-icon" />,
  PencilSquareIcon: () => <span data-testid="pencil-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
}));

describe("GrantMilestoneOptionsMenu", () => {
  const mockPendingMilestone: UnifiedMilestone = {
    uid: "milestone-001",
    type: "grant",
    title: "Build MVP",
    completed: false,
    createdAt: "2024-01-01",
    chainID: 10,
    refUID: "grant-001",
    source: {
      grantMilestone: {
        milestone: { uid: "milestone-001", title: "Build MVP", verified: [] },
        grant: { uid: "grant-001", chainID: 10 },
      },
    },
  } as unknown as UnifiedMilestone;

  const mockCompletedMilestone: UnifiedMilestone = {
    ...mockPendingMilestone,
    completed: {
      createdAt: "2024-06-01",
      data: { reason: "Done", proofOfWork: "" },
    },
  } as unknown as UnifiedMilestone;

  const mockCompleteFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows Edit option for pending milestones", async () => {
    const user = userEvent.setup();
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockPendingMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={false}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: "Open milestone actions" }));

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("hides Edit option for completed milestones", async () => {
    const user = userEvent.setup();
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockCompletedMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={true}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open milestone actions" }));

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
  });

  it("opens edit dialog when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockPendingMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open milestone actions" }));
    await user.click(screen.getByText("Edit"));

    expect(screen.getByTestId("milestone-edit-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("milestone-edit-dialog")).toHaveAttribute("data-is-open", "true");
  });

  it("renders Mark as Complete disabled when already completed", async () => {
    const user = userEvent.setup();
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockCompletedMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={true}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open milestone actions" }));
    const completeButton = screen.getByText("Mark as Complete").closest("button");
    expect(completeButton).toBeDisabled();
  });

  it("always renders delete option", async () => {
    const user = userEvent.setup();
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockPendingMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open milestone actions" }));
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("has accessible aria-label on the menu button", () => {
    render(
      <GrantMilestoneOptionsMenu
        milestone={mockPendingMilestone}
        completeFn={mockCompleteFn}
        alreadyCompleted={false}
      />
    );

    expect(screen.getByRole("button", { name: "Open milestone actions" })).toBeInTheDocument();
  });
});
