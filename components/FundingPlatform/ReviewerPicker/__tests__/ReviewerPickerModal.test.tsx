"use client";

/**
 * ReviewerPickerModal — layout and save-payload tests
 *
 * Covers:
 * - Two-column layout renders when `applicationAssignment` is provided
 * - Single-column layout renders when `applicationAssignment` is absent
 * - Right-column × button removes address from staged save payload
 * - Save emits union of (kept-on-right) ∪ (selected-on-left)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@/services/application-reviewers.service", () => ({
  applicationReviewersService: { assignReviewers: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/services/program-reviewers.service", () => ({
  programReviewersService: { addReviewer: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/services/milestone-reviewers.service", () => ({
  milestoneReviewersService: { addReviewer: vi.fn().mockResolvedValue(undefined) },
}));

const mockUseCommunityReviewers = vi.fn();
vi.mock("@/hooks/useCommunityReviewers", () => ({
  useCommunityReviewers: (...args: unknown[]) => mockUseCommunityReviewers(...args),
}));

const mockUseCommunityReviewerPrograms = vi.fn();
vi.mock("@/hooks/useCommunityReviewerPrograms", () => ({
  useCommunityReviewerPrograms: (...args: unknown[]) => mockUseCommunityReviewerPrograms(...args),
}));

// Lightweight stubs for UI primitives
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input type="checkbox" {...props} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {isLoading ? "Loading…" : children}
    </button>
  ),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

vi.mock("./EmptyState", () => ({
  default: ({ onAddNew }: { onAddNew: () => void }) => (
    <button type="button" onClick={onAddNew} data-testid="empty-state">
      Add reviewer
    </button>
  ),
}));

vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    REVIEWERS: {
      PROGRAM: (id: string) => ["reviewers", "program", id],
      MILESTONE: (id: string) => ["reviewers", "milestone", id],
    },
  },
}));

// ── Test helpers ──────────────────────────────────────────────────────────────

import { applicationReviewersService } from "@/services/application-reviewers.service";
import type { CommunityReviewer } from "@/services/community-reviewers/community-reviewers.types";
import ReviewerPickerModal from "../ReviewerPickerModal";
import type { ReviewerPickerModalProps } from "../ReviewerPickerModal.types";

const mockAssignReviewers = vi.mocked(applicationReviewersService.assignReviewers);

const poolReviewers: CommunityReviewer[] = [
  {
    publicAddress: "0xalice",
    name: "Alice",
    email: "alice@example.com",
    telegram: "",
    slack: "",
    picture: undefined,
    roles: ["program-reviewer"],
    lastSeenAt: new Date().toISOString(),
  },
  {
    publicAddress: "0xbob",
    name: "Bob",
    email: "bob@example.com",
    telegram: "",
    slack: "",
    picture: undefined,
    roles: ["program-reviewer"],
    lastSeenAt: new Date().toISOString(),
  },
  {
    publicAddress: "0xcarol",
    name: "Carol",
    email: "carol@example.com",
    telegram: "",
    slack: "",
    picture: undefined,
    roles: ["program-reviewer"],
    lastSeenAt: new Date().toISOString(),
  },
];

function setupHooks() {
  mockUseCommunityReviewers.mockReturnValue({
    items: poolReviewers,
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  });
  mockUseCommunityReviewerPrograms.mockReturnValue({ data: { items: [] } });
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderModal(props: Partial<ReviewerPickerModalProps> = {}) {
  const qc = makeQueryClient();
  const defaults: ReviewerPickerModalProps = {
    open: true,
    onOpenChange: vi.fn(),
    communityUID: "community-1",
    programId: "program-1",
    reviewerType: "program",
    assignedAddresses: [],
    onCompleted: vi.fn(),
  };
  return render(
    <QueryClientProvider client={qc}>
      <ReviewerPickerModal {...defaults} {...props} />
    </QueryClientProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReviewerPickerModal — layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("renders single-column layout when applicationAssignment is not provided", () => {
    renderModal();

    // In single-column mode there is no "This application" column header.
    expect(screen.queryByText(/this application/i)).not.toBeInTheDocument();
    // The pool section header is present.
    expect(screen.getAllByText(/community pool/i).length).toBeGreaterThanOrEqual(1);
    // The "Add new reviewer" button is visible in single-column mode.
    expect(screen.getByTestId("add-new-reviewer-btn")).toBeInTheDocument();
  });

  it("renders two-column layout when applicationAssignment is provided", () => {
    renderModal({
      applicationAssignment: {
        applicationId: "app-1",
        currentlyAssigned: ["0xalice"],
      },
    });

    // Both column headers must be present.
    expect(screen.getAllByText(/community pool/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/this application/i).length).toBeGreaterThanOrEqual(1);

    // Alice is currently assigned — should appear in the right column.
    expect(screen.getByTestId("assigned-item-0xalice")).toBeInTheDocument();

    // The "Add new reviewer" dashed-border button should NOT appear in app-assignment mode.
    expect(screen.queryByTestId("add-new-reviewer-btn")).not.toBeInTheDocument();
  });

  it("shows pool items in left column in two-column mode", () => {
    renderModal({
      applicationAssignment: {
        applicationId: "app-1",
        currentlyAssigned: [],
      },
    });

    // All three pool reviewers should be listed.
    expect(screen.getByTestId("pool-item-0xalice")).toBeInTheDocument();
    expect(screen.getByTestId("pool-item-0xbob")).toBeInTheDocument();
    expect(screen.getByTestId("pool-item-0xcarol")).toBeInTheDocument();
  });
});

describe("ReviewerPickerModal — right-column × button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("removes address from the right column when × is clicked", () => {
    renderModal({
      applicationAssignment: {
        applicationId: "app-1",
        currentlyAssigned: ["0xalice", "0xbob"],
      },
    });

    // Both should be visible initially.
    expect(screen.getByTestId("assigned-item-0xalice")).toBeInTheDocument();
    expect(screen.getByTestId("assigned-item-0xbob")).toBeInTheDocument();

    // Click the × button for Alice.
    fireEvent.click(screen.getByTestId("unassign-btn-0xalice"));

    // Alice is removed from the right column.
    expect(screen.queryByTestId("assigned-item-0xalice")).not.toBeInTheDocument();
    // Bob remains.
    expect(screen.getByTestId("assigned-item-0xbob")).toBeInTheDocument();
  });

  it("re-enables the removed address in the pool list so it can be re-selected", () => {
    renderModal({
      applicationAssignment: {
        applicationId: "app-1",
        currentlyAssigned: ["0xalice"],
      },
    });

    // Alice starts as disabled (already assigned) in the pool.
    const alicePoolBtn = screen.getByTestId("pool-item-0xalice");
    expect(alicePoolBtn).toBeDisabled();

    // Remove Alice from the right column.
    fireEvent.click(screen.getByTestId("unassign-btn-0xalice"));

    // Now Alice should be enabled in the pool.
    expect(alicePoolBtn).not.toBeDisabled();
  });
});

describe("ReviewerPickerModal — save payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("save emits union of (kept-on-right) ∪ (selected-on-left) via assignReviewers", async () => {
    // Alice and Bob are currently assigned; user removes Alice and selects Carol from the pool.
    renderModal({
      applicationAssignment: {
        applicationId: "app-1",
        currentlyAssigned: ["0xalice", "0xbob"],
      },
    });

    // Unassign Alice from the right column.
    fireEvent.click(screen.getByTestId("unassign-btn-0xalice"));

    // Select Carol from the pool (left column).
    fireEvent.click(screen.getByTestId("pool-item-0xcarol"));

    // Click Save.
    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(mockAssignReviewers).toHaveBeenCalledTimes(1);
    });

    const [applicationId, request] = mockAssignReviewers.mock.calls[0];
    expect(applicationId).toBe("app-1");
    // Final list should be Bob (kept) + Carol (newly added), Alice removed.
    const addresses: string[] = request.appReviewerAddresses;
    expect(addresses).toContain("0xbob");
    expect(addresses).toContain("0xcarol");
    expect(addresses).not.toContain("0xalice");
  });

  it("save with only unassignments (no new selections) calls assignReviewers with reduced list", async () => {
    renderModal({
      applicationAssignment: {
        applicationId: "app-2",
        currentlyAssigned: ["0xalice", "0xbob"],
      },
    });

    // Remove both.
    fireEvent.click(screen.getByTestId("unassign-btn-0xalice"));
    fireEvent.click(screen.getByTestId("unassign-btn-0xbob"));

    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(mockAssignReviewers).toHaveBeenCalledTimes(1);
    });

    const [, request] = mockAssignReviewers.mock.calls[0];
    expect(request.appReviewerAddresses).toHaveLength(0);
  });
});
