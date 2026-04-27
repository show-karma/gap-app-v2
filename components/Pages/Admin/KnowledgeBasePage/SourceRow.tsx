"use client";

import {
  FileBadge,
  FileText,
  FolderOpen,
  Globe,
  Network,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { type ComponentType, memo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import {
  useDeleteKnowledgeSource,
  useResyncKnowledgeSource,
  useUpdateKnowledgeSource,
} from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import {
  KNOWLEDGE_SOURCE_KIND_LABELS,
  type KnowledgeSource,
  type KnowledgeSourceKind,
} from "@/types/v2/knowledge-base";

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
  if (!source.isActive) {
    return {
      tone: "paused",
      label: "Paused",
      dot: "bg-stone-400 dark:bg-zinc-500",
    };
  }
  if (!source.lastSyncedAt) {
    return {
      tone: "idle",
      label: "Queued for first sync",
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
  if (stats.unchanged) {
    out.push({
      symbol: "=",
      value: stats.unchanged,
      className: "text-stone-500 dark:text-zinc-500",
    });
  }
  return out;
}

// ── Row ──────────────────────────────────────────────────────────────────────

function SourceRowImpl({ source, communityIdOrSlug, isFirst }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateKnowledgeSource(communityIdOrSlug);
  const resync = useResyncKnowledgeSource(communityIdOrSlug);
  const del = useDeleteKnowledgeSource(communityIdOrSlug);

  const kind = KIND_STYLES[source.kind];
  const status = getStatusMeta(source);
  const KindIcon = kind.Icon;
  const parts = diffParts(source);
  const isPaused = !source.isActive;

  const handleToggleActive = async () => {
    try {
      await update.mutateAsync({
        sourceId: source.id,
        patch: { isActive: !source.isActive },
      });
      toast.success(source.isActive ? "Source paused." : "Source resumed.");
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

  return (
    <li
      className={`group relative grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900/60 ${
        isFirst ? "" : "border-t border-stone-200 dark:border-zinc-800"
      }`}
    >
      {/* Kind glyph — neutral square tile, design pattern */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 ${
          isPaused ? "opacity-55" : ""
        }`}
        aria-hidden="true"
      >
        <KindIcon className={`h-4 w-4 ${kind.fg}`} strokeWidth={1.75} />
      </div>

      {/* Title / URL / meta */}
      <div className={`min-w-0 ${isPaused ? "opacity-70" : ""}`}>
        <div className="flex items-baseline gap-2.5">
          <p className="truncate text-sm font-semibold leading-tight text-stone-900 dark:text-zinc-100">
            {source.title}
          </p>
          <span className="shrink-0 text-xs font-normal text-stone-500 dark:text-zinc-500">
            {KNOWLEDGE_SOURCE_KIND_LABELS[source.kind]}
          </span>
        </div>

        <p
          className="mt-0.5 truncate font-mono text-xs leading-snug text-stone-500 dark:text-zinc-500"
          title={source.externalId}
        >
          {source.externalId}
        </p>

        {/* Meta line: state dot + label · last sync · diff stats */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${status.dot} ${
                status.pulse ? "animate-pulse" : ""
              }`}
            />
            <span>
              {status.label}
              {source.lastSyncedAt && status.tone === "success" ? (
                <span className="ml-1 tabular-nums text-stone-400 dark:text-zinc-600">
                  · {timeAgo(source.lastSyncedAt)}
                </span>
              ) : null}
            </span>
          </span>

          {parts.length > 0 && (
            <>
              <span aria-hidden="true" className="text-stone-300 dark:text-zinc-700">
                ·
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                {parts.map((p) => (
                  <span key={p.symbol} className={`font-semibold ${p.className}`}>
                    {p.symbol}
                    {p.value}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>

        {source.lastSyncError && (
          <p
            className="mt-2 line-clamp-2 max-w-2xl rounded border-l-2 border-rose-300 bg-rose-50/60 px-2 py-1 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            title={source.lastSyncError}
          >
            {source.lastSyncError}
          </p>
        )}
      </div>

      {/* Actions — ghost icon-only buttons, full opacity */}
      <div className="flex shrink-0 items-center gap-0.5">
        <RowAction
          label="Sync now"
          onClick={handleResync}
          disabled={resync.isPending}
          spinning={resync.isPending}
          Icon={RefreshCw}
        />
        <RowAction
          label={source.isActive ? "Pause syncing" : "Resume syncing"}
          onClick={handleToggleActive}
          disabled={update.isPending}
          Icon={source.isActive ? Pause : Play}
        />
        <RowAction
          label="Delete source"
          onClick={() => setConfirmDelete(true)}
          tone="danger"
          Icon={Trash2}
        />
      </div>

      <DeleteDialog
        externalIsOpen={confirmDelete}
        externalSetIsOpen={setConfirmDelete}
        isLoading={del.isPending}
        title="Delete this source? This will remove its documents and chunks."
        deleteFunction={handleDelete}
        buttonElement={null}
      />
    </li>
  );
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
      <Icon aria-hidden="true" className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

export const SourceRow = memo(SourceRowImpl);
