"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileBadge,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Inbox,
  Network,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Target,
  Trash2,
} from "lucide-react";
import { type ComponentType, memo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { useKnowledgeSourceDocuments } from "@/hooks/knowledge-base/useKnowledgeSourceDocuments";
import {
  useDeleteKnowledgeSource,
  useResyncKnowledgeSource,
  useUpdateKnowledgeSource,
} from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import {
  KNOWLEDGE_SOURCE_KIND_LABELS,
  KNOWLEDGE_SOURCE_KIND_SHORT,
  type KnowledgeDocument,
  type KnowledgeSource,
  type KnowledgeSourceKind,
} from "@/types/v2/knowledge-base";
import { EditSourceDialog } from "./EditSourceDialog";

interface Props {
  source: KnowledgeSource;
  communityIdOrSlug: string;
  /** Whether this is the first row in the list. Suppresses the top divider so
   * the row aligns flush with the list container's top edge. */
  isFirst?: boolean;
}

// ── Kind metadata ────────────────────────────────────────────────────────────
//
// The design renders each kind glyph in a neutral square tile rather than a
// tinted circle — quieter rhythm down the list. We keep a soft tint on the
// glyph itself so admins can still scan kinds at a glance.

interface KindStyle {
  Icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
    strokeWidth?: number;
  }>;
  fg: string;
}

const KIND_STYLES: Record<KnowledgeSourceKind, KindStyle> = {
  url: {
    Icon: Globe,
    fg: "text-sky-600 dark:text-sky-400",
  },
  sitemap: {
    Icon: Network,
    fg: "text-violet-600 dark:text-violet-400",
  },
  gdrive_file: {
    Icon: FileText,
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  gdrive_folder: {
    Icon: FolderOpen,
    fg: "text-amber-600 dark:text-amber-400",
  },
  pdf_url: {
    Icon: FileBadge,
    fg: "text-rose-600 dark:text-rose-400",
  },
};

// ── Status meta ──────────────────────────────────────────────────────────────
//
// A single inline `state-dot` + label communicates status, matching the
// design's compact row. The previous left-edge spine is gone. We keep the
// tone enum because it's still useful for the syncing/idle icon swap and to
// drive the dot color consistently.

type StatusTone = "success" | "partial" | "failed" | "syncing" | "idle" | "paused";

interface StatusMeta {
  tone: StatusTone;
  label: string;
  dot: string;
  /** When true the dot pulses to telegraph activity (queued/syncing) */
  pulse?: boolean;
}

function getStatusMeta(source: KnowledgeSource): StatusMeta {
  // DEV-194: paused is explicit and authoritative — the backend skips
  // sync AND excludes the source's chunks from retrieval. The label is
  // just "Paused" (no "sync" qualifier) because both axes stop at once.
  if (source.paused) {
    return {
      tone: "paused",
      label: "Paused",
      dot: "bg-stone-400 dark:bg-zinc-500",
    };
  }
  if (!source.isActive) {
    // Legacy `isActive=false` — the long-term disable axis. Today no UI
    // control flips this, but pre-existing rows might already be in
    // this state. Keep the badge so admins see "this is off" without
    // conflating it with paused.
    return {
      tone: "paused",
      label: "Inactive",
      dot: "bg-stone-400 dark:bg-zinc-500",
    };
  }
  // The "Queued for sync" early-return must only fire when the row is
  // actually idle — i.e. the worker hasn't claimed it yet AND no terminal
  // status has been written. Concretely: lastSyncedAt is null AND status
  // is neither "syncing" (worker mid-fetch on a first run), "failed", nor
  // "partial". Skipping any of those checks paints over real state — a
  // first-sync-syncing row would mis-render as amber "Queued" instead of
  // sky "Syncing", which the QA dogfood pass caught.
  if (
    !source.lastSyncedAt &&
    source.lastSyncStatus !== "failed" &&
    source.lastSyncStatus !== "partial" &&
    source.lastSyncStatus !== "syncing"
  ) {
    return {
      tone: "idle",
      label: "Queued for sync",
      dot: "bg-amber-500",
      pulse: true,
    };
  }
  switch (source.lastSyncStatus) {
    case "success":
      return {
        tone: "success",
        label: "Synced",
        dot: "bg-emerald-500",
      };
    case "partial":
      return {
        tone: "partial",
        label: "Partial sync",
        dot: "bg-amber-500",
      };
    case "failed":
      return {
        tone: "failed",
        label: "Failed",
        dot: "bg-rose-500",
      };
    case "syncing":
      return {
        tone: "syncing",
        label: "Syncing",
        dot: "bg-sky-500",
        pulse: true,
      };
    default:
      return {
        tone: "idle",
        label: "Idle",
        dot: "bg-stone-400 dark:bg-zinc-500",
      };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

interface DiffPart {
  symbol: string;
  value: number;
  className: string;
}

function diffParts(source: KnowledgeSource): DiffPart[] {
  const stats = source.lastSyncStats ?? {};
  const out: DiffPart[] = [];
  if (stats.added) {
    out.push({
      symbol: "+",
      value: stats.added,
      className: "text-emerald-600 dark:text-emerald-400",
    });
  }
  if (stats.updated) {
    out.push({
      symbol: "~",
      value: stats.updated,
      className: "text-sky-600 dark:text-sky-400",
    });
  }
  if (stats.removed) {
    out.push({
      symbol: "−",
      value: stats.removed,
      className: "text-rose-600 dark:text-rose-400",
    });
  }
  // `=N` (unchanged docs) is intentionally omitted. It's the boring case
  // that fires on every successful sync where nothing has changed since
  // last run — surfacing it on every row turns the meta strip into
  // visual noise without adding signal. Real changes (+, ~, −) still
  // show. The state badge ("Synced") + timestamp already convey
  // "everything is fine" when nothing has changed.
  return out;
}

// ── Row ──────────────────────────────────────────────────────────────────────

function SourceRowImpl({ source, communityIdOrSlug, isFirst }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // DEV-202: edit dialog open state. The dialog hydrates from the
  // `source` prop on each open, so toggling here is enough — we don't
  // need to copy the source into local state.
  const [editOpen, setEditOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const update = useUpdateKnowledgeSource(communityIdOrSlug);
  const resync = useResyncKnowledgeSource(communityIdOrSlug);
  const del = useDeleteKnowledgeSource(communityIdOrSlug);
  // Folder-style sources fan out into many child documents — the expand
  // affordance is what gives admins visibility into them. For url, pdf_url,
  // and a plain gdrive_file the source is one document, so the expanded
  // panel would just mirror what the row already shows.
  const isFolderStyle = sourceFansOut(source);

  const kind = KIND_STYLES[source.kind];
  const status = getStatusMeta(source);
  const KindIcon = kind.Icon;
  const parts = diffParts(source);
  // DEV-194: dim the row whenever it's "off" — either paused (the new
  // explicit switch) or legacy isActive=false. The status badge still
  // distinguishes the two states; this just keeps the visual treatment
  // consistent with pre-DEV-194 behavior for inactive rows.
  const isDimmed = source.paused || !source.isActive;

  const handleTogglePaused = async () => {
    try {
      await update.mutateAsync({
        sourceId: source.id,
        patch: { paused: !source.paused },
      });
      toast.success(source.paused ? "Source resumed." : "Source paused.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handleResync = async () => {
    try {
      await resync.mutateAsync(source.id);
      toast.success("Sync queued — will run on the next worker tick.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resync failed.");
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync(source.id);
      toast.success("Source deleted.");
      setConfirmDelete(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  // Tinting on a failed row signals the failure visually so the per-row
  // error excerpt is no longer needed — the page-level grouped banner
  // (in KnowledgeBasePage) names the count, and the row tint plus the
  // "Failed" entry in the mono meta strip carry the rest.
  const isFailed = status.tone === "failed";
  const isSyncingNow = status.tone === "syncing";
  const isPartial = status.tone === "partial";
  // Queued = the worker hasn't claimed this row yet. Either brand-new
  // (never synced) or just-clicked-Sync (backend's markPendingSync
  // cleared status + lastSyncedAt). The Sync button is gated for both
  // states so a double-click can't enqueue redundant work — there's
  // nothing for "force reprocess" to do until the worker finishes.
  // DEV-194: paused rows aren't "queued" — claimDueForSync skips them,
  // so a Sync click would have no effect; gate the button accordingly.
  // Same reasoning applies to is_active=false: claimDueForSync filters
  // those out too, so the button has to be disabled for the click to
  // honestly reflect what the backend will do.
  const isQueued =
    source.isActive && !source.paused && !source.lastSyncedAt && status.tone === "idle";
  const syncBlocked = isSyncingNow || isQueued || source.paused || !source.isActive;

  return (
    <li className={isFirst ? "" : "border-t border-stone-200 dark:border-zinc-800"}>
      <div
        className={`group relative grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5 transition-colors ${
          isFailed
            ? "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/15 dark:hover:bg-rose-950/25"
            : "hover:bg-stone-50 dark:hover:bg-zinc-900/60"
        }`}
      >
        {/* Kind glyph — square tile. Tints red on failed rows so the
          failure is legible at a glance even when scanning the icon column. */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
            isFailed
              ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40"
              : "border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900"
          } ${isDimmed ? "opacity-55" : ""}`}
          aria-hidden="true"
        >
          <KindIcon
            className={`h-4 w-4 ${isFailed ? "text-rose-600 dark:text-rose-400" : kind.fg}`}
            strokeWidth={1.75}
          />
        </div>

        {/* Title / URL / meta */}
        <div className={`min-w-0 ${isDimmed ? "opacity-70" : ""}`}>
          <div className="flex items-baseline gap-2.5">
            <p className="truncate text-sm font-semibold leading-tight text-stone-900 dark:text-zinc-100">
              {source.title}
            </p>
            <span className="shrink-0 text-xs font-normal text-stone-500 dark:text-zinc-500">
              {KNOWLEDGE_SOURCE_KIND_LABELS[source.kind]}
            </span>
          </div>

          <p
            className="mt-0.5 font-mono text-xs leading-snug text-stone-500 dark:text-zinc-500"
            title={source.externalId}
          >
            {/* Middle-truncation preserves both the domain prefix AND the
              meaningful slug suffix (e.g. ".../introducing-fil-propgf-...")
              instead of just chopping the tail off. The full URL stays
              available on hover via the `title` attribute. */}
            {truncateMiddle(source.externalId, 80)}
          </p>

          {/* Mono uppercase resource-style metadata strip — items separated
            by hairline rules. Inline 7-bar sparkline at the far right
            communicates sync history at a glance. */}
          <div className="mt-1.5 flex flex-wrap items-stretch gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.04em] text-stone-500 dark:text-zinc-500">
            <span
              className={`inline-flex items-center gap-1.5 border-r border-stone-200 pr-2.5 dark:border-zinc-800 ${
                isFailed
                  ? "text-rose-600 dark:text-rose-400"
                  : isSyncingNow
                    ? "text-sky-600 dark:text-sky-400"
                    : isPartial
                      ? "text-amber-600 dark:text-amber-400"
                      : status.tone === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-stone-500 dark:text-zinc-500"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${status.dot} ${
                  status.pulse ? "animate-pulse" : ""
                }`}
              />
              <span className="font-medium">{status.label}</span>
            </span>
            {/* Kind shorthand (`WEB`/`DOC`/`PDF`/...) — design's compact
              resource-line marker. Redundant with the title-row label
              but reads well as a left-anchored monospace tag. */}
            <span className="inline-flex items-center border-r border-stone-200 px-2.5 dark:border-zinc-800">
              {KNOWLEDGE_SOURCE_KIND_SHORT[source.kind]}
            </span>
            {/* "Added" — always shown so admins can tell when a source
              was registered, independent of whether it ever synced.
              Drives recency sorting in the user's head. */}
            <span className="inline-flex items-center border-r border-stone-200 px-2.5 tabular-nums dark:border-zinc-800">
              Added {timeAgo(source.createdAt)}
            </span>
            {/* "Synced" — only when there's been a successful or terminal
              sync. Distinct from "Added" so the row makes the gap
              visible: a source added a week ago and last synced 10m ago
              reads correctly as "Added 7d ago · Synced 10m ago". */}
            {source.lastSyncedAt && (
              <span className="inline-flex items-center border-r border-stone-200 px-2.5 tabular-nums dark:border-zinc-800">
                Synced {timeAgo(source.lastSyncedAt)}
              </span>
            )}
            {parts.length > 0 && (
              <span className="inline-flex items-center gap-1.5 border-r border-stone-200 px-2.5 tabular-nums dark:border-zinc-800">
                {parts.map((p) => (
                  <span key={p.symbol} className={`font-semibold ${p.className}`}>
                    {p.symbol}
                    {p.value}
                  </span>
                ))}
              </span>
            )}
            {/* DEV-192: surface follow-links state in the meta strip. Only
              meaningful for kind=gdrive_file (the backend rejects the
              flag elsewhere), so we gate on both. The label is short by
              design — the dialog explains the depth=1 caveat in detail
              when the toggle is shown. */}
            {source.followLinks && source.kind === "gdrive_file" && (
              <span
                className="inline-flex items-center gap-1.5 border-r border-stone-200 px-2.5 text-stone-500 dark:border-zinc-800 dark:text-zinc-500"
                title="Follows links to other Google Docs (one level deep)"
              >
                <GitBranch aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
                Linked
              </span>
            )}
            {(isFailed || isPartial) && source.lastSyncError && (
              <span
                className={`inline-flex items-center truncate px-2.5 ${
                  isFailed
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
                title={source.lastSyncError}
                style={{ maxWidth: 280 }}
              >
                <span className="truncate">{shortenError(source.lastSyncError)}</span>
              </span>
            )}
          </div>

          {source.goal && (
            <p
              className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-stone-500 dark:text-zinc-500"
              title={`Curator purpose: ${source.goal}`}
            >
              <Target
                aria-hidden="true"
                className="mt-[2px] h-3 w-3 shrink-0 text-stone-400 dark:text-zinc-600"
                strokeWidth={1.75}
              />
              <span className="line-clamp-2 italic">{source.goal}</span>
            </p>
          )}
        </div>

        {/* Actions — ghost icon-only buttons. Sync is disabled when an
          existing run is already in flight (status === 'syncing') so a
          double-click can't enqueue a redundant claim while the worker
          tick is mid-fetch. */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Documents toggle — only meaningful for folder-style sources
            (sitemap, gdrive_folder, and gdrive_file with followLinks).
            Single-doc sources already show everything in the row above. */}
          {isFolderStyle && (
            <RowAction
              label={docsOpen ? "Hide documents" : "Show documents"}
              onClick={() => setDocsOpen((open) => !open)}
              Icon={docsOpen ? ChevronDown : ChevronRight}
            />
          )}
          {/* Open original — `externalId` is the URL for url/pdf_url and a
            Drive doc id for gdrive_file. The mapping below produces a
            usable href in either case. Hidden for kinds where it's not
            meaningful (sitemap, gdrive_folder). */}
          {externalHref(source) && (
            <a
              href={externalHref(source) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              title="Open original"
              aria-label="Open original"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-sky-400/40"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
          <RowAction
            label={
              source.paused
                ? "Resume to sync — paused sources are skipped"
                : !source.isActive
                  ? "Source is inactive — sync is disabled"
                  : isSyncingNow
                    ? "Sync in progress"
                    : isQueued
                      ? "Already queued for sync"
                      : "Sync now"
            }
            onClick={handleResync}
            disabled={resync.isPending || syncBlocked}
            spinning={resync.isPending || isSyncingNow}
            Icon={RefreshCw}
          />
          <RowAction
            label={
              source.paused
                ? "Resume — back in sync and search"
                : "Pause — skip sync and hide from search"
            }
            onClick={handleTogglePaused}
            disabled={update.isPending}
            Icon={source.paused ? Play : Pause}
          />
          {/* DEV-202: Edit slots between Pause and Delete. Edits that
            change content-affecting fields (goal, link, follow-links
            on) prompt a confirmation modal before saving. */}
          <RowAction label="Edit source" onClick={() => setEditOpen(true)} Icon={Pencil} />
          <RowAction
            label="Delete source"
            onClick={() => setConfirmDelete(true)}
            disabled={del.isPending}
            tone="danger"
            Icon={Trash2}
          />
        </div>
      </div>
      {isFolderStyle && docsOpen && (
        <DocumentsPanel sourceId={source.id} communityIdOrSlug={communityIdOrSlug} />
      )}

      <DeleteDialog
        externalIsOpen={confirmDelete}
        externalSetIsOpen={setConfirmDelete}
        isLoading={del.isPending}
        title="Delete this source? This will remove its documents and chunks."
        deleteFunction={handleDelete}
        buttonElement={null}
      />

      <EditSourceDialog
        communityIdOrSlug={communityIdOrSlug}
        source={editOpen ? source : null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </li>
  );
}

// ── Documents panel ─────────────────────────────────────────────────────────
//
// Lists every document under a folder-style source. The query only fires
// when the panel mounts, so the page doesn't pay for hidden expansions.
// All four states (loading / empty / error / data) render explicitly so we
// never return `null` from a data-fetching component.

function DocumentsPanel({
  sourceId,
  communityIdOrSlug,
}: {
  sourceId: string;
  communityIdOrSlug: string;
}) {
  const { data, isLoading, isError, error, refetch, isRefetching } = useKnowledgeSourceDocuments(
    communityIdOrSlug,
    sourceId
  );

  const documents = data ?? [];
  const visible = documents.filter((d) => !d.deletedAt);
  // discoveredFromId → parent doc title lookup. The parent is in the same
  // payload (it's a sibling under the same source), so a single Map keeps
  // the resolution O(N) without an extra request.
  const byId = new Map(visible.map((d) => [d.id, d]));

  return (
    <div className="border-t border-dashed border-stone-200 bg-stone-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-stone-500 dark:text-zinc-500">
          Documents{" "}
          {!isLoading && !isError && (
            <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-zinc-600">
              ({visible.length === 1 ? "1 document" : `${visible.length} documents`})
            </span>
          )}
        </p>
        {!isLoading && !isError && documents.length > 0 && (
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 transition hover:text-stone-900 disabled:opacity-50 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            <RefreshCw
              className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        )}
      </div>

      {isLoading ? (
        <DocumentsSkeleton />
      ) : isError ? (
        <DocumentsError
          message={error instanceof Error ? error.message : "Failed to load documents."}
          onRetry={() => refetch()}
        />
      ) : visible.length === 0 ? (
        <DocumentsEmpty />
      ) : (
        <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {visible.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              parentTitle={
                doc.discoveredFromId ? (byId.get(doc.discoveredFromId)?.title ?? null) : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <ul
      className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Loading documents"
      data-testid="documents-skeleton"
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-zinc-800" aria-hidden="true" />
          <div className="h-3 flex-1 rounded bg-stone-100 dark:bg-zinc-900" aria-hidden="true" />
          <div className="h-3 w-16 rounded bg-stone-100 dark:bg-zinc-900" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}

function DocumentsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Couldn&apos;t load documents.</p>
        <p className="mt-0.5 text-rose-600/90 dark:text-rose-400/90">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md border border-rose-300 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
      >
        Retry
      </button>
    </div>
  );
}

function DocumentsEmpty() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-stone-200 bg-white px-3 py-3 text-[12px] text-stone-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
      <Inbox className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>No documents yet — they&apos;ll appear here after the next sync.</p>
    </div>
  );
}

const DocumentRow = memo(function DocumentRowImpl({
  doc,
  parentTitle,
}: {
  doc: KnowledgeDocument;
  parentTitle: string | null;
}) {
  // When the loader hasn't yet populated a real title, the row falls back
  // to the URL — better than rendering an opaque doc id. SitemapLoader
  // sets `title = loc` on first listing; the next sync replaces it with
  // the page's actual title.
  const displayTitle = doc.title && doc.title !== doc.sourceUrl ? doc.title : null;

  return (
    <li className="flex items-center gap-3 px-3 py-2 text-[12px]">
      <div className="min-w-0 flex-1">
        {displayTitle ? (
          <p
            className="truncate font-medium text-stone-800 dark:text-zinc-200"
            title={displayTitle}
          >
            {displayTitle}
          </p>
        ) : null}
        <p
          className={`truncate font-mono text-[11px] ${
            displayTitle
              ? "text-stone-500 dark:text-zinc-500"
              : "font-medium text-stone-700 dark:text-zinc-300"
          }`}
          title={doc.sourceUrl}
        >
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {doc.sourceUrl}
          </a>
        </p>
        {parentTitle && (
          <p
            className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-stone-500 dark:text-zinc-500"
            title={`Discovered via "${parentTitle}"`}
          >
            <GitBranch aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
            via {parentTitle}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right font-mono text-[10.5px] uppercase tracking-[0.04em] text-stone-500 dark:text-zinc-500">
        <p>{doc.chunkCount === 1 ? "1 chunk" : `${doc.chunkCount} chunks`}</p>
        <p className="text-[10px] text-stone-400 dark:text-zinc-600">
          {timeAgo(doc.lastFetchedAt)}
        </p>
      </div>
    </li>
  );
});

function sourceFansOut(source: KnowledgeSource): boolean {
  if (source.kind === "sitemap" || source.kind === "gdrive_folder") return true;
  // gdrive_file w/ followLinks discovers child docs as it ingests — same
  // expansion story as a folder loader from the admin's perspective.
  return source.kind === "gdrive_file" && source.followLinks;
}

function RowAction({
  label,
  onClick,
  disabled,
  spinning,
  tone = "neutral",
  Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  tone?: "neutral" | "danger";
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  // Ghost icon-only button: subdued by default, picks up ink/danger color on
  // hover. Matches `.btn.ghost.icon-only` from the design.
  const danger =
    "text-stone-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400";
  const neutral =
    "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 disabled:opacity-40 disabled:hover:bg-transparent dark:focus-visible:ring-sky-400/40 ${
        tone === "danger" ? danger : neutral
      }`}
    >
      <Icon aria-hidden={true} className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

// Build the user-facing URL for the source's "Open original" action.
// - `url` and `pdf_url` store the URL directly in `externalId`.
// - `gdrive_file` stores a Drive doc ID; reconstruct the docs.google.com
//    edit URL.
// - `gdrive_folder` and `sitemap` don't have a single useful URL, so
//   we return null and the action button doesn't render.
function externalHref(source: KnowledgeSource): string | null {
  const id = source.externalId.trim();
  if (!id) return null;
  switch (source.kind) {
    case "url":
    case "pdf_url":
      return id.startsWith("http://") || id.startsWith("https://") ? id : null;
    case "gdrive_file":
      // Admins paste either the share URL or a bare doc ID. If it's
      // already a URL, use it; otherwise reconstruct the canonical
      // edit URL from the doc id.
      if (id.startsWith("https://")) return id;
      return `https://docs.google.com/document/d/${id}/edit`;
    case "gdrive_folder":
    case "sitemap":
    default:
      return null;
  }
}

// Middle-truncate long strings (URLs primarily) so both the domain
// prefix and the slug suffix stay visible. The full string remains
// available on hover via the title attribute on the rendering element.
function truncateMiddle(s: string, max = 80): string {
  if (!s || s.length <= max) return s;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

// Trim noisy backend errors to a glanceable phrase. Keep the full message
// in the title attribute so admins can still read it on hover.
function shortenError(msg: string): string {
  // Strip URLs (they show up in the row above anyway) and trailing periods.
  const stripped = msg
    .replace(/https?:\/\/\S+/g, "")
    .trim()
    .replace(/\.$/, "");
  if (stripped.length <= 60) return stripped;
  return `${stripped.slice(0, 57)}…`;
}

export const SourceRow = memo(SourceRowImpl);
