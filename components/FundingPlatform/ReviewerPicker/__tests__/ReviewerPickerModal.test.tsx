"use client";

/**
 * ReviewerPickerModal — add-only flow tests
 *
 * Covers:
 * - Pool items render
 * - `disabledAddresses` grays pool rows and blocks selection
 * - Toggling a pool row adds/removes a staged row
 * - "Select all" / "Unselect all" toggle
 * - Save adds each new pool selection to the program reviewer service
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

import type { CommunityReviewer } from "@/services/community-reviewers/community-reviewers.types";
import { programReviewersService } from "@/services/program-reviewers.service";
import ReviewerPickerModal from "../ReviewerPickerModal";
import type { ReviewerPickerModalProps } from "../ReviewerPickerModal.types";

const mockAddProgramReviewer = vi.mocked(programReviewersService.addReviewer);

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

describe("ReviewerPickerModal — pool rendering and disabled state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("renders all pool reviewers", () => {
    renderModal();

    expect(screen.getByTestId("pool-item-0xalice")).toBeInTheDocument();
    expect(screen.getByTestId("pool-item-0xbob")).toBeInTheDocument();
    expect(screen.getByTestId("pool-item-0xcarol")).toBeInTheDocument();
  });

  it("disables pool rows whose addresses are in disabledAddresses", () => {
    renderModal({ disabledAddresses: ["0xalice"] });

    expect(screen.getByTestId("pool-item-0xalice")).toBeDisabled();
    expect(screen.getByTestId("pool-item-0xbob")).not.toBeDisabled();
  });

  it("does not stage a disabled pool row when clicked", () => {
    renderModal({ disabledAddresses: ["0xalice"] });

    fireEvent.click(screen.getByTestId("pool-item-0xalice"));

    expect(screen.queryByTestId("selected-row-0xalice")).not.toBeInTheDocument();
  });
});

describe("ReviewerPickerModal — pool toggling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("adds a row to the selected list when a pool item is clicked", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("pool-item-0xbob"));

    expect(screen.getByTestId("selected-row-0xbob")).toBeInTheDocument();
  });

  it("removes the row when the same pool item is clicked again", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("pool-item-0xbob"));
    expect(screen.getByTestId("selected-row-0xbob")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("pool-item-0xbob"));
    expect(screen.queryByTestId("selected-row-0xbob")).not.toBeInTheDocument();
  });
});

describe("ReviewerPickerModal — Select all / Unselect all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("renders a 'Select all' button by default", () => {
    renderModal();

    expect(screen.getByTestId("toggle-select-all-pool")).toHaveTextContent(/select all/i);
  });

  it("stages every selectable pool row when 'Select all' is clicked", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("toggle-select-all-pool"));

    expect(screen.getByTestId("selected-row-0xalice")).toBeInTheDocument();
    expect(screen.getByTestId("selected-row-0xbob")).toBeInTheDocument();
    expect(screen.getByTestId("selected-row-0xcarol")).toBeInTheDocument();
  });

  it("excludes disabled rows from 'Select all'", () => {
    renderModal({ disabledAddresses: ["0xalice"] });

    fireEvent.click(screen.getByTestId("toggle-select-all-pool"));

    expect(screen.queryByTestId("selected-row-0xalice")).not.toBeInTheDocument();
    expect(screen.getByTestId("selected-row-0xbob")).toBeInTheDocument();
    expect(screen.getByTestId("selected-row-0xcarol")).toBeInTheDocument();
  });

  it("flips to 'Unselect all' when every selectable row is staged, and unselects on click", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("toggle-select-all-pool"));
    expect(screen.getByTestId("toggle-select-all-pool")).toHaveTextContent(/unselect all/i);

    fireEvent.click(screen.getByTestId("toggle-select-all-pool"));
    expect(screen.queryByTestId("selected-row-0xalice")).not.toBeInTheDocument();
    expect(screen.queryByTestId("selected-row-0xbob")).not.toBeInTheDocument();
    expect(screen.queryByTestId("selected-row-0xcarol")).not.toBeInTheDocument();
  });
});

describe("ReviewerPickerModal — save payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("calls programReviewersService.addReviewer once per staged pool row", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("pool-item-0xalice"));
    fireEvent.click(screen.getByTestId("pool-item-0xcarol"));

    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(mockAddProgramReviewer).toHaveBeenCalledTimes(2);
    });

    const emails = mockAddProgramReviewer.mock.calls.map((call) => call[1].email);
    expect(emails).toContain("alice@example.com");
    expect(emails).toContain("carol@example.com");
  });

  it("disables Save when nothing is staged", () => {
    renderModal();

    expect(screen.getByTestId("save-btn")).toBeDisabled();
  });
});
