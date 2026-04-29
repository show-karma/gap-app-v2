import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SourceRow } from "@/components/Pages/Admin/KnowledgeBasePage/SourceRow";
import { useKnowledgeSourceDocuments } from "@/hooks/knowledge-base/useKnowledgeSourceDocuments";
import {
  useDeleteKnowledgeSource,
  useResyncKnowledgeSource,
  useUpdateKnowledgeSource,
} from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import type { KnowledgeDocument, KnowledgeSource } from "@/types/v2/knowledge-base";
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

vi.mock("@/hooks/knowledge-base/useKnowledgeSourceDocuments", () => ({
  useKnowledgeSourceDocuments: vi.fn(),
}));

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({ externalIsOpen }: { externalIsOpen?: boolean }) =>
    externalIsOpen ? <div data-testid="delete-dialog" /> : null,
}));

const mockUpdate = useUpdateKnowledgeSource as ReturnType<typeof vi.fn>;
const mockResync = useResyncKnowledgeSource as ReturnType<typeof vi.fn>;
const mockDelete = useDeleteKnowledgeSource as ReturnType<typeof vi.fn>;
const mockDocs = useKnowledgeSourceDocuments as ReturnType<typeof vi.fn>;

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
  followLinks: false,
  lastSyncedAt: "2026-04-26T00:00:00.000Z",
  lastSyncStatus: "success",
  lastSyncError: null,
  lastSyncStats: { added: 1 },
  createdAt: "2026-04-26T00:00:00.000Z",
  updatedAt: "2026-04-26T00:00:00.000Z",
  ...overrides,
});

const createDocument = (overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument => ({
  id: "doc-1",
  sourceId: "src-1",
  externalId: "https://docs.example.com/a",
  title: "Page A",
  sourceUrl: "https://docs.example.com/a",
  mimeType: "text/markdown",
  lastFetchedAt: "2026-04-26T00:00:00.000Z",
  byteSize: 100,
  chunkCount: 4,
  discoveredFromId: null,
  deletedAt: null,
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
    // Default the docs hook to a stable empty result so closed rows don't
    // accidentally render a panel. Tests that exercise the expand path
    // override this per-case.
    mockDocs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });
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

    it("renders 'Syncing' when the very first sync is in flight (lastSyncedAt null, status syncing)", () => {
      // Regression for the QA dogfood finding: the "Queued for sync"
      // early-return guard skipped over rows where lastSyncStatus had
      // already advanced to "syncing" but lastSyncedAt was still null
      // (the worker has claimed it but hasn't written a terminal result
      // yet). Those rows used to render amber "Queued for sync" instead
      // of sky "Syncing".
      renderRow(
        createSource({
          lastSyncedAt: null,
          lastSyncStatus: "syncing",
          lastSyncError: null,
        })
      );
      expect(screen.getByText("Syncing")).toBeInTheDocument();
      expect(screen.queryByText("Queued for sync")).not.toBeInTheDocument();
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
      renderRow(createSource({ lastSyncStatus: "failed", lastSyncError: "fetch failed" }));
      const syncBtn = screen.getByRole("button", { name: /^sync now$/i });
      expect(syncBtn).toBeEnabled();
    });
  });

  describe("documents expand affordance", () => {
    // Folder-style sources (sitemap, gdrive_folder, gdrive_file with
    // followLinks) fan out into many documents. The expand toggle is the
    // only way for admins to see what was actually ingested.

    it("does NOT render the documents toggle for single-doc kinds (gdrive_file without followLinks)", () => {
      renderRow(createSource({ kind: "gdrive_file", followLinks: false }));
      expect(screen.queryByRole("button", { name: /show documents/i })).not.toBeInTheDocument();
    });

    it("does NOT render the documents toggle for url kind", () => {
      renderRow(createSource({ kind: "url", externalId: "https://docs.example.com/page" }));
      expect(screen.queryByRole("button", { name: /show documents/i })).not.toBeInTheDocument();
    });

    it("renders the documents toggle for sitemap kind", () => {
      renderRow(
        createSource({ kind: "sitemap", externalId: "https://docs.example.com/sitemap.xml" })
      );
      expect(screen.getByRole("button", { name: /show documents/i })).toBeInTheDocument();
    });

    it("renders the documents toggle for gdrive_file when followLinks is on", () => {
      renderRow(createSource({ kind: "gdrive_file", followLinks: true }));
      expect(screen.getByRole("button", { name: /show documents/i })).toBeInTheDocument();
    });
  });

  describe("documents panel — render states", () => {
    function renderSitemapWithDocs() {
      return renderRow(
        createSource({
          id: "src-sitemap-1",
          kind: "sitemap",
          externalId: "https://docs.example.com/sitemap.xml",
        })
      );
    }

    it("shows a skeleton while documents are loading", () => {
      mockDocs.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      renderSitemapWithDocs();
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByTestId("documents-skeleton")).toBeInTheDocument();
    });

    it("shows an empty state when the source has no documents yet", () => {
      mockDocs.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      renderSitemapWithDocs();
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByText(/No documents yet/i)).toBeInTheDocument();
    });

    it("shows an error state with retry when the documents fetch fails", () => {
      const refetch = vi.fn();
      mockDocs.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Server boom"),
        refetch,
        isRefetching: false,
      });

      renderSitemapWithDocs();
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByText(/Couldn't load documents/i)).toBeInTheDocument();
      expect(screen.getByText("Server boom")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(refetch).toHaveBeenCalled();
    });

    it("renders one row per document with sitemap-loader-style URL fallback for unsynced titles", () => {
      mockDocs.mockReturnValue({
        data: [
          createDocument({
            id: "doc-1",
            title: "Page A — Welcome",
            sourceUrl: "https://docs.example.com/a",
            chunkCount: 4,
          }),
          // SitemapLoader.listFolder seeds title === sourceUrl on first
          // listing. Until the URL loader rewrites it from <title>, the
          // UI must render the URL gracefully (not the raw "URL" string).
          createDocument({
            id: "doc-2",
            title: "https://docs.example.com/b",
            sourceUrl: "https://docs.example.com/b",
            chunkCount: 1,
          }),
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      renderSitemapWithDocs();
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByText("Page A — Welcome")).toBeInTheDocument();
      // Unsynced row falls back to the URL — verify the URL appears as a
      // link target and that no separate "title" row was rendered for it.
      const links = screen.getAllByRole("link", { name: "https://docs.example.com/b" });
      expect(links.length).toBeGreaterThanOrEqual(1);
      // Count is wrapped in parens in the panel header (e.g. "(2 documents)").
      expect(screen.getByText(/2 documents/)).toBeInTheDocument();
      // Singular/plural rendering — chunk count switches phrasing at 1.
      expect(screen.getByText("4 chunks")).toBeInTheDocument();
      expect(screen.getByText("1 chunk")).toBeInTheDocument();
    });

    it("filters out soft-deleted documents from the list", () => {
      mockDocs.mockReturnValue({
        data: [
          createDocument({ id: "doc-active", title: "Live page" }),
          createDocument({
            id: "doc-deleted",
            title: "Removed page",
            deletedAt: "2026-04-26T00:00:00.000Z",
          }),
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      renderSitemapWithDocs();
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByText("Live page")).toBeInTheDocument();
      expect(screen.queryByText("Removed page")).not.toBeInTheDocument();
      // Singular form when only one non-deleted doc remains.
      expect(screen.getByText(/1 document\b/)).toBeInTheDocument();
    });

    it("annotates discovered docs with a 'via parent' chip when discoveredFromId resolves", () => {
      // DEV-192 bridge: gdrive_file with followLinks discovers child docs
      // and stamps `discoveredFromId` so the per-doc table can show the
      // breadcrumb back to the parent doc.
      mockDocs.mockReturnValue({
        data: [
          createDocument({ id: "parent", title: "Index page" }),
          createDocument({
            id: "child",
            title: "Section 1",
            discoveredFromId: "parent",
          }),
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      renderRow(
        createSource({
          kind: "gdrive_file",
          followLinks: true,
        })
      );
      fireEvent.click(screen.getByRole("button", { name: /show documents/i }));

      expect(screen.getByText(/via Index page/i)).toBeInTheDocument();
    });
  });
});
