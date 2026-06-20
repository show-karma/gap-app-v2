/**
 * @file Shell-level tests for CommentOverlay. Mocks the orchestration
 * hook `useCommenting` and the heavier sub-tree primitives so the test
 * exercises only the overlay's own behaviors: loading skeleton, error
 * copy, empty state without "0 comments" literal, orphan lane render,
 * aria-live verb selection, and the reportRevoked hide.
 */

import { render, screen } from "@testing-library/react";

import type { SharedReportCommentNode } from "@/types/donor-research-comments";

// ── Heavy sub-tree mocks ────────────────────────────────────────────
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="sheet" data-open={open ?? false}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/src/features/donor-research/components/shared-view/AnchoredAffordances", () => ({
  AnchoredAffordances: () => <div data-testid="anchored-affordances" />,
}));

vi.mock("@/src/features/donor-research/components/shared-view/SelectionAffordance", () => ({
  SelectionAffordance: () => <div data-testid="selection-affordance" />,
}));

vi.mock("@/src/features/donor-research/components/shared-view/IdentityBadge", () => ({
  IdentityBadge: () => <div data-testid="identity-badge" />,
}));

vi.mock("@/src/features/donor-research/components/shared-view/IdentityCaptureDialog", () => ({
  IdentityCaptureDialog: () => null,
}));

vi.mock("@/src/features/donor-research/components/shared-view/CommentRow", () => ({
  CommentRow: ({ node }: { node: SharedReportCommentNode }) => (
    <div data-testid={`comment-row-${node.id}`}>{node.displayName}</div>
  ),
}));

vi.mock("@/src/features/donor-research/components/shared-view/CommentComposer", () => ({
  CommentComposer: () => <div data-testid="comment-composer" />,
}));

// ── useCommenting mock ──────────────────────────────────────────────
import { useCommenting } from "@/src/features/donor-research/components/shared-view/useCommenting";

vi.mock("@/src/features/donor-research/components/shared-view/useCommenting");
const mockUseCommenting = vi.mocked(useCommenting);

import { CommentOverlay } from "@/src/features/donor-research/components/shared-view/CommentOverlay";

function makeNode(overrides: Partial<SharedReportCommentNode> = {}): SharedReportCommentNode {
  return {
    id: "n1",
    parentCommentId: null,
    isAdvisor: false,
    displayName: "Donor Dana",
    anchor: { kind: "section", sectionKey: "methodology" },
    body: "Looks good",
    createdAt: "2026-06-19T00:00:00.000Z",
    children: [],
    ...overrides,
  } as SharedReportCommentNode;
}

type UseCommentingReturn = ReturnType<typeof useCommenting>;

function makeUseCommenting(overrides: Partial<UseCommentingReturn> = {}): UseCommentingReturn {
  return {
    query: { isLoading: false, error: null } as UseCommentingReturn["query"],
    tree: [],
    identity: {
      displayName: null,
      isAdvisor: false,
      hasIdentity: false,
      refresh: vi.fn(),
      clearIdentity: vi.fn(),
    } as UseCommentingReturn["identity"],
    isPosting: false,
    composer: { mode: "closed" },
    composerError: null,
    openRootComposer: vi.fn(),
    openReplyComposer: vi.fn(),
    closeComposer: vi.fn(),
    sheetOpen: false,
    setSheetOpen: vi.fn(),
    activatePin: vi.fn(),
    counts: {
      byKey: new Map(),
      rootsByKey: new Map(),
      orphanRoots: [],
    },
    selectionAffordance: null,
    dismissSelectionAffordance: vi.fn(),
    submitComposer: vi.fn(),
    identityModalMode: null,
    setIdentityModalMode: vi.fn(),
    retryPendingPost: vi.fn(),
    scrollTargetCommentId: null,
    clearScrollTarget: vi.fn(),
    highlightRefreshKey: 0,
    ...overrides,
  } as UseCommentingReturn;
}

describe("CommentOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the loading skeleton when the query is fetching", () => {
    mockUseCommenting.mockReturnValue(
      makeUseCommenting({
        query: { isLoading: true, error: null } as UseCommentingReturn["query"],
      })
    );
    render(<CommentOverlay token="tk" />);
    expect(screen.getByTestId("comments-loading")).toBeInTheDocument();
  });

  it("renders the error state when the query errors out", () => {
    mockUseCommenting.mockReturnValue(
      makeUseCommenting({
        query: {
          isLoading: false,
          error: new Error("net"),
        } as UseCommentingReturn["query"],
      })
    );
    render(<CommentOverlay token="tk" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t load comments/i);
  });

  it("renders 'Be the first to comment' and no '0 comments' literal in empty state", () => {
    mockUseCommenting.mockReturnValue(makeUseCommenting({ tree: [] }));
    const { container } = render(<CommentOverlay token="tk" />);
    expect(screen.getByText(/be the first to comment/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0 comments/i);
  });

  it("labels the comments trigger with the total when comments exist", () => {
    const tree = [makeNode({ id: "r1" }), makeNode({ id: "r2" })];
    mockUseCommenting.mockReturnValue(makeUseCommenting({ tree }));
    render(<CommentOverlay token="tk" />);
    // The trigger button shows "N comments" via pluralize.
    expect(screen.getByRole("button", { name: /^2 comments$/ })).toBeInTheDocument();
  });

  it("renders an orphan-lane section with pluralized header when orphan roots exist", () => {
    const orphan = makeNode({
      id: "orphan-1",
      anchor: {
        kind: "text_range",
        targetKind: "candidate",
        targetId: "c1",
        quote: "moved text",
        prefix: "before",
        suffix: "after",
      },
    });
    mockUseCommenting.mockReturnValue(
      makeUseCommenting({
        counts: {
          byKey: new Map(),
          rootsByKey: new Map(),
          orphanRoots: [orphan],
        },
      })
    );
    render(<CommentOverlay token="tk" />);
    expect(screen.getByLabelText(/orphan comments/i)).toBeInTheDocument();
    expect(screen.getByText(/^1 orphan comment$/i)).toBeInTheDocument();
    // The preserved quote is rendered as a blockquote.
    expect(screen.getByText(/moved text/i)).toBeInTheDocument();
  });

  it("emits 'Comment added by X' in the aria-live region on a new root arrival", () => {
    mockUseCommenting.mockReturnValueOnce(makeUseCommenting({ tree: [] }));
    const { rerender } = render(<CommentOverlay token="tk" />);
    // Sanity: aria-live is empty on initial render.
    expect(screen.getByTestId("comment-announce")).toHaveTextContent("");
    // New root arrives.
    mockUseCommenting.mockReturnValueOnce(
      makeUseCommenting({
        tree: [makeNode({ id: "n1", displayName: "Donor Dana" })],
      })
    );
    rerender(<CommentOverlay token="tk" />);
    expect(screen.getByTestId("comment-announce")).toHaveTextContent(
      /comment added by donor dana/i
    );
  });

  it("emits 'Reply added by X' when the newest arrival is a reply", () => {
    mockUseCommenting.mockReturnValueOnce(
      makeUseCommenting({
        tree: [makeNode({ id: "root-1", displayName: "Root Roger" })],
      })
    );
    const { rerender } = render(<CommentOverlay token="tk" />);
    mockUseCommenting.mockReturnValueOnce(
      makeUseCommenting({
        tree: [
          makeNode({
            id: "root-1",
            displayName: "Root Roger",
            children: [
              makeNode({
                id: "reply-1",
                parentCommentId: "root-1",
                displayName: "Replier Renee",
                anchor: null,
              }),
            ],
          }),
        ],
      })
    );
    rerender(<CommentOverlay token="tk" />);
    expect(screen.getByTestId("comment-announce")).toHaveTextContent(
      /reply added by replier renee/i
    );
  });

  it("renders nothing when reportRevoked is true", () => {
    // useCommenting still returns its shape but we don't expect anything to render.
    mockUseCommenting.mockReturnValue(makeUseCommenting());
    const { container } = render(<CommentOverlay token="tk" reportRevoked />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes isAdvisor through to useCommenting", () => {
    mockUseCommenting.mockReturnValue(makeUseCommenting());
    render(<CommentOverlay token="tk" isAdvisor />);
    expect(mockUseCommenting).toHaveBeenCalledWith(
      "tk",
      expect.objectContaining({ enabled: true, isAdvisor: true })
    );
  });

  it("disables useCommenting when reportRevoked is true", () => {
    mockUseCommenting.mockReturnValue(makeUseCommenting());
    // Even though overlay renders nothing, the hook is called with enabled=false.
    render(<CommentOverlay token="tk" reportRevoked />);
    expect(mockUseCommenting).toHaveBeenCalledWith(
      "tk",
      expect.objectContaining({ enabled: false })
    );
  });
});
