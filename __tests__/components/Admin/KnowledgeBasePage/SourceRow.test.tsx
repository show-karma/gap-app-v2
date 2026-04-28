import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SourceRow } from "@/components/Pages/Admin/KnowledgeBasePage/SourceRow";
import {
  useDeleteKnowledgeSource,
  useResyncKnowledgeSource,
  useUpdateKnowledgeSource,
} from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import type { KnowledgeSource } from "@/types/v2/knowledge-base";
import "@testing-library/jest-dom";

// ── Mocks ──
//
// We only care about the row's pure rendering paths here. The mutation hooks
// are stubbed so the component renders synchronously without firing network
// calls or needing a QueryClient provider.

vi.mock("@/hooks/knowledge-base/useKnowledgeSourceMutations", () => ({
  useUpdateKnowledgeSource: vi.fn(),
  useResyncKnowledgeSource: vi.fn(),
  useDeleteKnowledgeSource: vi.fn(),
}));

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({ externalIsOpen }: { externalIsOpen?: boolean }) =>
    externalIsOpen ? <div data-testid="delete-dialog" /> : null,
}));

const mockUpdate = useUpdateKnowledgeSource as ReturnType<typeof vi.fn>;
const mockResync = useResyncKnowledgeSource as ReturnType<typeof vi.fn>;
const mockDelete = useDeleteKnowledgeSource as ReturnType<typeof vi.fn>;

// ── Helpers ──

const createSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id: "src-1",
  communityId: "comm-1",
  programId: null,
  kind: "gdrive_file",
  externalId: "https://docs.google.com/document/d/abc/edit",
  title: "Onboarding doc",
  isActive: true,
  goal: null,
  syncIntervalMin: 1440,
  lastSyncedAt: "2026-04-26T00:00:00.000Z",
  lastSyncStatus: "success",
  lastSyncError: null,
  lastSyncStats: { added: 1 },
  createdAt: "2026-04-26T00:00:00.000Z",
  updatedAt: "2026-04-26T00:00:00.000Z",
  ...overrides,
});

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const renderRow = (source: KnowledgeSource) =>
  render(
    <ul>
      <SourceRow source={source} communityIdOrSlug="filecoin" />
    </ul>,
    { wrapper: Wrapper }
  );

// ── Tests ──

describe("SourceRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockResync.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockDelete.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  describe("status pill", () => {
    it("renders 'Synced' for a successful sync", () => {
      renderRow(createSource({ lastSyncStatus: "success" }));
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });

    it("renders 'Queued for sync' when no sync has happened yet", () => {
      renderRow(
        createSource({
          lastSyncedAt: null,
          lastSyncStatus: null,
          lastSyncError: null,
        })
      );
      expect(screen.getByText("Queued for sync")).toBeInTheDocument();
    });

    it("renders 'Failed' (and the error banner) when the very first sync fails", () => {
      // Regression test for the bug where first-sync-failed rows were painted
      // as "Queued for first sync" because lastSyncedAt is still null after a
      // failed attempt — see SourceRow.getStatusMeta for the fix.
      renderRow(
        createSource({
          lastSyncedAt: null,
          lastSyncStatus: "failed",
          lastSyncError: "boom",
        })
      );
      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.queryByText("Queued for first sync")).not.toBeInTheDocument();
      // Error excerpt banner is rendered next to the status line.
      expect(screen.getByText("boom")).toBeInTheDocument();
    });

    it("renders 'Partial sync' when the very first sync succeeded only in part", () => {
      renderRow(
        createSource({
          lastSyncedAt: null,
          lastSyncStatus: "partial",
          lastSyncError: "1 doc failed",
        })
      );
      expect(screen.getByText("Partial sync")).toBeInTheDocument();
      expect(screen.getByText("1 doc failed")).toBeInTheDocument();
    });

    it("renders 'Sync paused' when the source is inactive (regardless of sync status)", () => {
      // Specifically "Sync paused" rather than "Paused" — the source's
      // existing chunks remain searchable while paused; only future
      // syncs stop. The label communicates that distinction.
      renderRow(createSource({ isActive: false, lastSyncStatus: "failed" }));
      expect(screen.getByText("Sync paused")).toBeInTheDocument();
    });
  });

  describe("delete action", () => {
    it("disables the delete trigger while a delete is in flight", () => {
      mockDelete.mockReturnValue({ mutateAsync: vi.fn(), isPending: true });
      renderRow(createSource());
      const deleteBtn = screen.getByRole("button", { name: /delete source/i });
      expect(deleteBtn).toBeDisabled();
    });

    it("enables the delete trigger when no delete is in flight", () => {
      renderRow(createSource());
      const deleteBtn = screen.getByRole("button", { name: /delete source/i });
      expect(deleteBtn).toBeEnabled();
    });
  });

  describe("sync action gating", () => {
    // The backend's triggerSync flips status to 'syncing' immediately to
    // surface that the user's click was received. The button must then
    // refuse re-clicks until the worker writes a terminal status — a
    // double-click during in-flight ingestion would just enqueue redundant
    // claims for the same row.
    it("disables the sync trigger when status is already 'syncing'", () => {
      renderRow(createSource({ lastSyncStatus: "syncing" }));
      const syncBtn = screen.getByRole("button", { name: /sync in progress/i });
      expect(syncBtn).toBeDisabled();
    });

    it("disables the sync trigger when row is queued (null status, no lastSyncedAt)", () => {
      // After triggerSync the backend clears status + lastSyncedAt. The
      // worker hasn't claimed the row yet, so re-clicking Sync would just
      // enqueue redundant work — gate the button until a terminal state.
      renderRow(
        createSource({
          lastSyncedAt: null,
          lastSyncStatus: null,
          lastSyncError: null,
        })
      );
      const syncBtn = screen.getByRole("button", { name: /already queued for sync/i });
      expect(syncBtn).toBeDisabled();
    });

    it("enables the sync trigger when status is success", () => {
      renderRow(createSource({ lastSyncStatus: "success" }));
      const syncBtn = screen.getByRole("button", { name: /^sync now$/i });
      expect(syncBtn).toBeEnabled();
    });

    it("enables the sync trigger when status is failed (so admins can retry)", () => {
      renderRow(
        createSource({ lastSyncStatus: "failed", lastSyncError: "fetch failed" })
      );
      const syncBtn = screen.getByRole("button", { name: /^sync now$/i });
      expect(syncBtn).toBeEnabled();
    });
  });
});
