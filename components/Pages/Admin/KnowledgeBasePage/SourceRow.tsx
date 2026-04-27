"use client";

import {
  CheckCircle2,
  CircleDashed,
  FileBadge,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Network,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  TriangleAlert,
  XCircle,
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
}

// ── Kind metadata ────────────────────────────────────────────────────────────
//
// Each source kind gets a distinct glyph + accent. The accents are intentionally
// muted so several rows next to each other don't fight for attention.

interface KindStyle {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  bg: string;
  fg: string;
}

const KIND_STYLES: Record<KnowledgeSourceKind, KindStyle> = {
  url: {
    Icon: Globe,
    bg: "bg-sky-50 dark:bg-sky-950/30",
    fg: "text-sky-700 dark:text-sky-300",
  },
  sitemap: {
    Icon: Network,
    bg: "bg-violet-50 dark:bg-violet-950/30",
    fg: "text-violet-700 dark:text-violet-300",
  },
  gdrive_file: {
    Icon: FileText,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    fg: "text-emerald-700 dark:text-emerald-300",
  },
  gdrive_folder: {
    Icon: FolderOpen,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    fg: "text-amber-700 dark:text-amber-300",
  },
  pdf_url: {
    Icon: FileBadge,
    bg: "bg-rose-50 dark:bg-rose-950/30",
    fg: "text-rose-700 dark:text-rose-300",
  },
};

// ── Status / spine ───────────────────────────────────────────────────────────

type StatusTone = "success" | "partial" | "failed" | "syncing" | "idle" | "paused";

interface StatusMeta {
  tone: StatusTone;
  label: string;
  spine: string;
  badgeBg: string;
  badgeFg: string;
  dot: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

function getStatusMeta(source: KnowledgeSource): StatusMeta {
  if (!source.isActive) {
    return {
      tone: "paused",
      label: "Paused",
      spine: "bg-stone-300 dark:bg-zinc-700",
      badgeBg: "bg-stone-100 dark:bg-zinc-800",
      badgeFg: "text-stone-700 dark:text-zinc-300",
      dot: "bg-stone-400 dark:bg-zinc-500",
      Icon: Pause,
    };
  }
  if (!source.lastSyncedAt) {
    return {
      tone: "idle",
      label: "Awaiting first sync",
      spine: "bg-stone-200 dark:bg-zinc-800",
      badgeBg: "bg-stone-100 dark:bg-zinc-800/80",
      badgeFg: "text-stone-700 dark:text-zinc-300",
      dot: "bg-stone-400 dark:bg-zinc-500",
      Icon: CircleDashed,
    };
  }
  switch (source.lastSyncStatus) {
    case "success":
      return {
        tone: "success",
        label: "Synced",
        spine: "bg-emerald-500",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
        badgeFg: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
        Icon: CheckCircle2,
      };
    case "partial":
      return {
        tone: "partial",
        label: "Partial",
        spine: "bg-amber-500",
        badgeBg: "bg-amber-50 dark:bg-amber-950/40",
        badgeFg: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
        Icon: TriangleAlert,
      };
    case "failed":
      return {
        tone: "failed",
        label: "Failed",
        spine: "bg-rose-500",
        badgeBg: "bg-rose-50 dark:bg-rose-950/40",
        badgeFg: "text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
        Icon: XCircle,
      };
    case "syncing":
      return {
        tone: "syncing",
        label: "Syncing",
        spine: "bg-sky-500",
        badgeBg: "bg-sky-50 dark:bg-sky-950/40",
        badgeFg: "text-sky-700 dark:text-sky-300",
        dot: "bg-sky-500",
        Icon: Loader2,
      };
    default:
      return {
        tone: "idle",
        label: "Idle",
        spine: "bg-stone-200 dark:bg-zinc-800",
        badgeBg: "bg-stone-100 dark:bg-zinc-800/80",
        badgeFg: "text-stone-700 dark:text-zinc-300",
        dot: "bg-stone-400 dark:bg-zinc-500",
        Icon: CircleDashed,
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

function SourceRowImpl({ source, communityIdOrSlug }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateKnowledgeSource(communityIdOrSlug);
  const resync = useResyncKnowledgeSource(communityIdOrSlug);
  const del = useDeleteKnowledgeSource(communityIdOrSlug);

  const kind = KIND_STYLES[source.kind];
  const status = getStatusMeta(source);
  const KindIcon = kind.Icon;
  const StatusIcon = status.Icon;
  const parts = diffParts(source);

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
    <li className="group relative">
      {/* Status spine — full height, 3px wide, on the very left edge of the row */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${status.spine}`} />

      <div className="flex items-start gap-4 px-5 py-4 pl-6 sm:px-6 sm:pl-7">
        {/* Kind glyph in tinted circle */}
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${kind.bg}`}
          aria-hidden="true"
        >
          <KindIcon className={`h-[18px] w-[18px] ${kind.fg}`} />
        </div>

        {/* Title / URL / meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-stone-900 dark:text-zinc-100">
              {source.title}
            </p>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-600">
              {KNOWLEDGE_SOURCE_KIND_LABELS[source.kind]}
            </span>
          </div>

          <p
            className="mt-1 truncate font-mono text-xs text-stone-500 dark:text-zinc-500"
            title={source.externalId}
          >
            {source.externalId}
          </p>

          {/* Meta line: status badge · last sync · diff stats */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.badgeBg} ${status.badgeFg}`}
            >
              {status.tone === "syncing" ? (
                <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
              ) : status.tone === "success" ||
                status.tone === "partial" ||
                status.tone === "failed" ? (
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              ) : (
                <StatusIcon aria-hidden="true" className="h-3 w-3" />
              )}
              {status.label}
            </span>

            <span className="text-[11px] tabular-nums text-stone-500 dark:text-zinc-500">
              <span className="text-stone-400 dark:text-zinc-600">Last sync · </span>
              {timeAgo(source.lastSyncedAt)}
            </span>

            {parts.length > 0 && (
              <span className="flex items-center gap-2 text-[11px] tabular-nums">
                {parts.map((p) => (
                  <span key={p.symbol} className={`font-semibold ${p.className}`}>
                    {p.symbol}
                    {p.value}
                  </span>
                ))}
              </span>
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

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
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
  const danger =
    "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300";
  const neutral =
    "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:opacity-40 disabled:hover:bg-transparent ${
        tone === "danger" ? danger : neutral
      }`}
    >
      <Icon aria-hidden="true" className={`h-[15px] w-[15px] ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

export const SourceRow = memo(SourceRowImpl);
