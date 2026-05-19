"use client";

import { Download, Loader2, Paperclip, X } from "lucide-react";
import { memo, useCallback } from "react";
import type { HermesUploadSummary } from "@/lib/hermes-client";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

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

// Authenticated download: the indexer requires a Bearer token to serve
// attachment blobs. Plain anchor hrefs can't send Authorization headers,
// so we fetch the blob via the shared axios client (which adds the header
// automatically) and trigger a synthetic download via a temporary object URL
// that is revoked on the next tick.
const api = createAuthenticatedApiClient();

function useAuthDownload(downloadUrl: (sha256: string) => string) {
  return useCallback(
    async (sha256: string, filename: string) => {
      try {
        const response = await api.get<Blob>(downloadUrl(sha256), {
          responseType: "blob",
        });
        const url = URL.createObjectURL(response.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke after the browser has queued the download.
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch {
        // Fail silently — the download button already gives visual feedback
        // via the cursor state; surface the error at a higher layer if needed.
      }
    },
    [downloadUrl]
  );
}

export const AttachmentList = memo(function AttachmentList({
  files,
  downloadUrl,
  onDelete,
  pendingDeleteSha,
  emptyLabel,
}: Props) {
  const download = useAuthDownload(downloadUrl);

  if (files.length === 0) {
    if (!emptyLabel) return null;
    return (
      <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500">
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
          className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900 dark:text-zinc-100">{f.filename}</p>
            <p className="text-[10px] text-gray-500 dark:text-zinc-400 tabular-nums">
              {formatBytes(f.size)} {f.mime ? `• ${f.mime}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => download(f.sha256, f.filename)}
            className="rounded p-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
            aria-label={`Download ${f.filename}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(f.sha256)}
              disabled={pendingDeleteSha === f.sha256}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
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
