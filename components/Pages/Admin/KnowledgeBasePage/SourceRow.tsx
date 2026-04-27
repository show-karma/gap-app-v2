"use client";

import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import {
  useDeleteKnowledgeSource,
  useResyncKnowledgeSource,
  useUpdateKnowledgeSource,
} from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import { KNOWLEDGE_SOURCE_KIND_LABELS, type KnowledgeSource } from "@/types/v2/knowledge-base";

interface Props {
  source: KnowledgeSource;
  communityIdOrSlug: string;
}

function statusBadge(source: KnowledgeSource) {
  if (!source.lastSyncedAt) {
    return { label: "Not synced", className: "bg-zinc-200 text-zinc-700" };
  }
  switch (source.lastSyncStatus) {
    case "success":
      return {
        label: "Synced",
        className: "bg-green-100 text-green-800",
      };
    case "partial":
      return {
        label: "Partial",
        className: "bg-amber-100 text-amber-900",
      };
    case "failed":
      return { label: "Failed", className: "bg-red-100 text-red-800" };
    case "syncing":
      return { label: "Syncing", className: "bg-blue-100 text-blue-800" };
    default:
      return { label: "Unknown", className: "bg-zinc-200 text-zinc-700" };
  }
}

function formatStats(source: KnowledgeSource): string {
  const stats = source.lastSyncStats;
  if (!stats || Object.keys(stats).length === 0) return "—";
  const parts: string[] = [];
  if (stats.added) parts.push(`+${stats.added}`);
  if (stats.updated) parts.push(`~${stats.updated}`);
  if (stats.removed) parts.push(`−${stats.removed}`);
  if (stats.unchanged) parts.push(`=${stats.unchanged}`);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function SourceRowImpl({ source, communityIdOrSlug }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateKnowledgeSource(communityIdOrSlug);
  const resync = useResyncKnowledgeSource(communityIdOrSlug);
  const del = useDeleteKnowledgeSource(communityIdOrSlug);

  const badge = statusBadge(source);

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
    <tr className="border-b border-zinc-200 dark:border-zinc-800">
      <td className="px-3 py-3">
        <div className="font-medium">{source.title}</div>
        <div className="text-xs text-zinc-500 break-all">{source.externalId}</div>
      </td>
      <td className="px-3 py-3 text-sm">{KNOWLEDGE_SOURCE_KIND_LABELS[source.kind]}</td>
      <td className="px-3 py-3 text-sm">
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${badge.className}`}>
          {badge.label}
        </span>
        {source.lastSyncError && (
          <div className="mt-1 max-w-xs truncate text-xs text-red-600" title={source.lastSyncError}>
            {source.lastSyncError}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {timeAgo(source.lastSyncedAt)}
      </td>
      <td className="px-3 py-3 text-sm font-mono">{formatStats(source)}</td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleResync}
            disabled={resync.isPending}
            className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            title="Resync now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={update.isPending}
            className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            title={source.isActive ? "Pause" : "Resume"}
          >
            {source.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <DeleteDialog
          externalIsOpen={confirmDelete}
          externalSetIsOpen={setConfirmDelete}
          isLoading={del.isPending}
          title="Delete this source? This will remove its documents and chunks."
          deleteFunction={handleDelete}
          buttonElement={null}
        />
      </td>
    </tr>
  );
}

export const SourceRow = memo(SourceRowImpl);
