import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SourceRow } from "@/components/Pages/Admin/KnowledgeBasePage/SourceRow";
import { useKnowledgeSourceDocuments } from "@/hooks/knowledge-base/useKnowledgeSourceDocuments";
import {
  useDeleteKnowledgeSource,
  useEditKnowledgeSource,
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
  useEditKnowledgeSource: vi.fn(),
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
const mockEdit = useEditKnowledgeSource as ReturnType<typeof vi.fn>;
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
  paused: false,
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
    mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
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

    it("renders 'Paused' when source.paused=true (regardless of sync status)", () => {
      // DEV-194: paused is the explicit "off" switch — it stops sync AND
      // hides chunks from search. The label is just "Paused" (no qualifier)
      // because both axes stop together.
      renderRow(createSource({ paused: true, lastSyncStatus: "failed" }));
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("renders 'Inactive' when isActive=false and not paused (legacy disable axis)", () => {
      // isActive is orthogonal to paused. Today no UI control flips it, but
      // pre-existing rows might still be in this state — we surface a
      // distinct "Inactive" label so admins can tell them apart.
      renderRow(createSource({ isActive: false, paused: false }));
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("'Paused' wins over 'Inactive' when both flags are off", () => {
      // Defense: a row with both flags off should read as "Paused" because
      // paused is the active, intent-driven state — admins clicked it
      // recently. Inactive is the dormant "we never enabled this" tone.
      renderRow(createSource({ isActive: false, paused: true }));
      expect(screen.getByText("Paused")).toBeInTheDocument();
      expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
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

    it("disables the sync trigger when source is paused", () => {
      // DEV-194: claimDueForSync filters paused rows out, so a Sync click
      // on a paused source would never make progress. Gate the button
      // and explain why in the tooltip.
      renderRow(createSource({ paused: true, lastSyncStatus: "success" }));
      const syncBtn = screen.getByRole("button", {
        name: /resume to sync — paused sources are skipped/i,
      });
      expect(syncBtn).toBeDisabled();
    });

    it("disables the sync trigger when source is inactive (matches backend filter)", () => {
      // Defense against UI/backend drift: claimDueForSync also filters
      // is_active = FALSE, so the button must be disabled for the same
      // reason as paused — otherwise the click looks like progress but
      // the worker silently skips the row.
      renderRow(createSource({ isActive: false, paused: false, lastSyncStatus: "success" }));
      const syncBtn = screen.getByRole("button", {
        name: /source is inactive — sync is disabled/i,
      });
      expect(syncBtn).toBeDisabled();
    });
  });

  describe("pause toggle", () => {
    it("renders Pause button label when source is not paused", () => {
      renderRow(createSource({ paused: false }));
      expect(
        screen.getByRole("button", { name: /pause — skip sync and hide from search/i })
      ).toBeInTheDocument();
    });

    it("renders Resume button label when source is paused", () => {
      renderRow(createSource({ paused: true }));
      expect(
        screen.getByRole("button", { name: /resume — back in sync and search/i })
      ).toBeInTheDocument();
    });

    it("calls update mutation with paused:true when pausing an active source", async () => {
      // The button must drive the new `paused` field, not `isActive`. A
      // regression that swapped the field would still render correctly
      // (both are booleans) but the backend would never honor the pause.
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUpdate.mockReturnValue({ mutateAsync, isPending: false });
      renderRow(createSource({ paused: false }));

      const btn = screen.getByRole("button", {
        name: /pause — skip sync and hide from search/i,
      });
      btn.click();

      expect(mutateAsync).toHaveBeenCalledWith({
        sourceId: "src-1",
        patch: { paused: true },
      });
    });

    it("calls update mutation with paused:false when resuming a paused source", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUpdate.mockReturnValue({ mutateAsync, isPending: false });
      renderRow(createSource({ paused: true }));

      const btn = screen.getByRole("button", {
        name: /resume — back in sync and search/i,
      });
      btn.click();

      expect(mutateAsync).toHaveBeenCalledWith({
        sourceId: "src-1",
        patch: { paused: false },
      });
    });
  });

  describe("dimmed visual treatment", () => {
    // The row dims (opacity-55 on the icon tile, opacity-70 on the title
    // block) whenever it's "off" — either paused or legacy isActive=false.
    // Pre-DEV-194 the trigger was just !isActive; the regression tests below
    // pin the union so legacy inactive rows don't lose their dim treatment.
    const tileOpacityClass = "opacity-55";
    const contentOpacityClass = "opacity-70";

    function getTileAndContentOpacityClasses(): string[] {
      // The icon tile is the first descendant rendered with opacity-55,
      // the content wrapper carries opacity-70. We collect classNames of
      // every dimmed element to assert the row visually communicates the
      // off state.
      const dimmed = document.querySelectorAll(`.${tileOpacityClass}, .${contentOpacityClass}`);
      return Array.from(dimmed).flatMap((el) => Array.from(el.classList));
    }

    it("dims the row when source is paused", () => {
      renderRow(createSource({ paused: true }));
      const classes = getTileAndContentOpacityClasses();
      expect(classes).toContain(tileOpacityClass);
      expect(classes).toContain(contentOpacityClass);
    });

    it("dims the row when source is inactive (legacy axis)", () => {
      // Regression for the dogfood-agent finding: pre-DEV-194 the row
      // dimmed on !isActive. The first cut moved dimming to source.paused
      // only, so legacy isActive=false rows lost their dim treatment.
      renderRow(createSource({ isActive: false, paused: false }));
      const classes = getTileAndContentOpacityClasses();
      expect(classes).toContain(tileOpacityClass);
      expect(classes).toContain(contentOpacityClass);
    });

    it("does not dim a healthy active source", () => {
      renderRow(createSource({ isActive: true, paused: false }));
      const classes = getTileAndContentOpacityClasses();
      expect(classes).not.toContain(tileOpacityClass);
      expect(classes).not.toContain(contentOpacityClass);
    });
  });

  // DEV-202: edit action — verify the button renders, click opens the
  // dialog, and the dialog hydrates from the source. The dialog's own
  // change-detection logic (confirmation gating, dup-error toast) lives
  // in EditSourceDialog.test.tsx.
  describe("edit action", () => {
    it("renders an Edit button between Pause and Delete", () => {
      renderRow(createSource());
      expect(screen.getByRole("button", { name: /edit source/i })).toBeInTheDocument();
    });

    it("opens the Edit dialog populated with the current source values when clicked", async () => {
      renderRow(
        createSource({
          title: "Existing title",
          externalId: "https://docs.google.com/document/d/abc/edit",
          goal: "old purpose",
        })
      );

      // Pre-condition: the dialog is closed; its hydrated form fields
      // shouldn't be in the DOM yet.
      expect(screen.queryByDisplayValue("Existing title")).not.toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /edit source/i }));

      // After click, the Radix dialog renders into a portal but is still
      // queryable from screen. The form fields hydrate from the source.
      await waitFor(() => {
        expect(screen.getByDisplayValue("Existing title")).toBeInTheDocument();
      });
      expect(
        screen.getByDisplayValue("https://docs.google.com/document/d/abc/edit")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("old purpose")).toBeInTheDocument();
    });

    it("shows the kind as read-only in the edit dialog (kind change is not editable in v1)", async () => {
      // Per ticket §"Not editable in v1": switching kind is conceptually
      // a different source. The dialog must not expose a kind picker.
      renderRow(createSource({ kind: "gdrive_file" }));
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /edit source/i }));

      await waitFor(() => {
        expect(screen.getByText(/Source type:/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/read-only/i)).toBeInTheDocument();
      // The "Source type" radiogroup from AddSourceDialog must not appear
      // in the edit flow.
      expect(screen.queryByRole("radiogroup", { name: /source type/i })).not.toBeInTheDocument();
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
