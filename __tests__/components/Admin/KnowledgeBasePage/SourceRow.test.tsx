import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SourceRow } from "@/components/Pages/Admin/KnowledgeBasePage/SourceRow";
import {
  useDeleteKnowledgeSource,
  useEditKnowledgeSource,
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
  useEditKnowledgeSource: vi.fn(),
}));

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({ externalIsOpen }: { externalIsOpen?: boolean }) =>
    externalIsOpen ? <div data-testid="delete-dialog" /> : null,
}));

const mockUpdate = useUpdateKnowledgeSource as ReturnType<typeof vi.fn>;
const mockResync = useResyncKnowledgeSource as ReturnType<typeof vi.fn>;
const mockDelete = useDeleteKnowledgeSource as ReturnType<typeof vi.fn>;
const mockEdit = useEditKnowledgeSource as ReturnType<typeof vi.fn>;

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
      const dimmed = document.querySelectorAll(
        `.${tileOpacityClass}, .${contentOpacityClass}`
      );
      return Array.from(dimmed).flatMap((el) =>
        Array.from(el.classList)
      );
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
      expect(
        screen.getByRole("button", { name: /edit source/i })
      ).toBeInTheDocument();
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
      expect(
        screen.queryByRole("radiogroup", { name: /source type/i })
      ).not.toBeInTheDocument();
    });
  });
});
