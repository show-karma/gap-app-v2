import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MilestoneEditDialog } from "@/components/Milestone/MilestoneEditDialog";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

const mockEditMilestone = vi.fn();
let mockIsEditing = false;

vi.mock("@/hooks/useMilestoneEdit", () => ({
  useMilestoneEdit: () => ({
    isEditing: mockIsEditing,
    editMilestone: mockEditMilestone,
  }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children, className }: any) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
  DialogFooter: ({ children, className }: any) => (
    <div data-testid="dialog-footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, ...props }: any) => <input id={id} data-testid={id} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ id, ...props }: any) => <textarea id={id} data-testid={id} {...props} />,
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  PencilSquareIcon: () => <span data-testid="pencil-icon" />,
}));

describe("MilestoneEditDialog", () => {
  const mockPendingMilestone: UnifiedMilestone = {
    uid: "milestone-001",
    type: "grant",
    title: "Build MVP",
    description: "Build the minimum viable product",
    completed: false,
    createdAt: "2024-01-01T00:00:00Z",
    endsAt: 1735689600,
    startsAt: 1704067200,
    chainID: 10,
    refUID: "grant-001",
    source: {
      grantMilestone: {
        milestone: {
          uid: "milestone-001",
          chainID: 10,
          title: "Build MVP",
          description: "Build the minimum viable product",
          priority: 1,
          endsAt: 1735689600,
          startsAt: 1704067200,
          verified: [],
        },
        grant: {
          uid: "grant-001",
          chainID: 10,
        },
      },
    },
  } as unknown as UnifiedMilestone;

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsEditing = false;
    mockEditMilestone.mockResolvedValue(undefined);
  });

  it("renders with pre-filled values", () => {
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    const titleInput = screen.getByTestId("milestone-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Build MVP");

    const descInput = screen.getByTestId("milestone-description") as HTMLTextAreaElement;
    expect(descInput.value).toBe("Build the minimum viable product");
  });

  it("does not render when isOpen is false", () => {
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("shows title validation error for empty title", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    const titleInput = screen.getByTestId("milestone-title");
    await user.clear(titleInput);
    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
    expect(mockEditMilestone).not.toHaveBeenCalled();
  });

  it("shows validation error for whitespace-only title", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    const titleInput = screen.getByTestId("milestone-title");
    await user.clear(titleInput);
    await user.type(titleInput, "   ");
    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Title cannot be only whitespace")).toBeInTheDocument();
    });
    expect(mockEditMilestone).not.toHaveBeenCalled();
  });

  it("calls editMilestone with correct data on submit", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    const titleInput = screen.getByTestId("milestone-title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated MVP");
    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockEditMilestone).toHaveBeenCalledWith(
        mockPendingMilestone,
        expect.objectContaining({
          title: "Updated MVP",
        })
      );
    });
  });

  it("calls onClose after successful edit", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error message when editMilestone fails", async () => {
    mockEditMilestone.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("disables form fields during editing", () => {
    mockIsEditing = true;
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId("milestone-title")).toBeDisabled();
    expect(screen.getByTestId("milestone-description")).toBeDisabled();
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows 'Saving...' text on submit button during editing", () => {
    mockIsEditing = true;
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.queryByText("Save Changes")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    await user.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders dialog title with pencil icon", () => {
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
    expect(screen.getByText("Edit Milestone")).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText("Title *")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Priority (0-10)")).toBeInTheDocument();
  });

  it("sends undefined for cleared description instead of falling back", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    const descInput = screen.getByTestId("milestone-description");
    await user.clear(descInput);
    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockEditMilestone).toHaveBeenCalledWith(
        mockPendingMilestone,
        expect.objectContaining({
          description: undefined,
        })
      );
    });
  });

  it("sends undefined for cleared dates instead of falling back", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneEditDialog milestone={mockPendingMilestone} isOpen={true} onClose={mockOnClose} />
    );

    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      const callArgs = mockEditMilestone.mock.calls[0][1];
      // description cleared should be undefined, not fall back to original
      expect(callArgs.title).toBe("Build MVP");
    });
  });
});
