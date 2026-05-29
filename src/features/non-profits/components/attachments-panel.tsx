"use client";

/**
 * Attachments panel — ported from grant-atlas
 * features/grant-atlas/components/research-workbench/attachments-panel.tsx.
 *
 * Renders a list of file attachments produced by the agent (CSV exports).
 * Decodes base64 in-process to avoid the double-copy overhead of data-URLs.
 */

import { Download, FileSpreadsheet } from "lucide-react";
import pluralize from "pluralize";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { AgentAttachment } from "../lib/agentic-philanthropy";

export function AttachmentsPanel({ attachments }: { attachments: AgentAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {attachments.map((attachment) => (
        <AttachmentRow
          key={`${attachment.handle}:${attachment.base64.length}`}
          attachment={attachment}
        />
      ))}
    </div>
  );
}

const AttachmentRow = function AttachmentRow({ attachment }: { attachment: AgentAttachment }) {
  const objectUrlRef = useRef<string | null>(null);

  // Revoke on unmount — browsers hold the underlying bytes until page unloads.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleDownload = () => {
    try {
      const blob = base64ToBlob(attachment.base64, attachment.contentType);
      if (!objectUrlRef.current) {
        objectUrlRef.current = URL.createObjectURL(blob);
      }
      const anchor = document.createElement("a");
      anchor.href = objectUrlRef.current;
      anchor.download = attachment.filename;
      // Some browsers require the anchor to be in the DOM to honor `download`.
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      // Silently ignore download errors — user can retry via the button
    }
  };

  const sizeLabel = formatBytes(estimateDecodedBytes(attachment.base64));

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="attachment-row"
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <FileSpreadsheet className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {attachment.filename}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {attachment.rowCount.toLocaleString()} {pluralize("row", attachment.rowCount)} ·{" "}
          {sizeLabel}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleDownload}
        aria-label={`Download ${attachment.filename}`}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  );
};

// In-process decode — avoids the double-copy overhead of fetch("data:...").
function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

function estimateDecodedBytes(base64: string): number {
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
