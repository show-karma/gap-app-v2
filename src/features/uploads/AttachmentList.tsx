"use client";

import { Download, Loader2, Paperclip, X } from "lucide-react";
import { memo } from "react";
import type { HermesUploadSummary } from "@/lib/hermes-client";

interface Props {
  files: HermesUploadSummary[];
  /** Where each file streams from. The server returns it with
   *  Content-Disposition: attachment so the browser downloads. */
  downloadUrl: (sha256: string) => string;
  /** Caller decides if/how delete is allowed (kanban: yes; chat: no on
   *  historical messages because the file is referenced by transcript). */
  onDelete?: (sha256: string) => void;
  pendingDeleteSha?: string;
  emptyLabel?: string;
}

export const AttachmentList = memo(function AttachmentList({
  files,
  downloadUrl,
  onDelete,
  pendingDeleteSha,
  emptyLabel,
}: Props) {
  if (files.length === 0) {
    if (!emptyLabel) return null;
    return (
      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <Paperclip className="h-3 w-3" aria-hidden />
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li
          key={f.sha256}
          className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{f.filename}</p>
            <p className="text-[10px] text-gray-500 tabular-nums">
              {formatBytes(f.size)} {f.mime ? `• ${f.mime}` : ""}
            </p>
          </div>
          <a
            href={downloadUrl(f.sha256)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label={`Download ${f.filename}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
          </a>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(f.sha256)}
              disabled={pendingDeleteSha === f.sha256}
              className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Remove ${f.filename}`}
            >
              {pendingDeleteSha === f.sha256 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
});

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
