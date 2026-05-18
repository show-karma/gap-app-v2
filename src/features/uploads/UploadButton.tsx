"use client";

import { Loader2, Paperclip } from "lucide-react";
import { type ChangeEvent, useId, useRef } from "react";
import { toast } from "react-hot-toast";

/** MIME allowlist — images, PDF, Office docs, plain text, CSV, Markdown. */
const DEFAULT_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json";

interface Props {
  onSelect: (file: File) => void;
  isUploading?: boolean;
  /** Free text — shown as the label. Default: "Attach". */
  label?: string;
  /** Max bytes; we enforce client-side to fail fast before the round-trip.
   *  Server still has the authoritative cap. */
  maxBytes?: number;
  accept?: string;
}

export function UploadButton({
  onSelect,
  isUploading,
  label = "Attach",
  maxBytes = 25 * 1024 * 1024,
  accept = DEFAULT_ACCEPT,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    if (file.size > maxBytes) {
      toast.error(`File exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)} MB limit`);
      return;
    }
    onSelect(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        onChange={handleChange}
        accept={accept}
        disabled={isUploading}
      />
      <label
        htmlFor={id}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 ${
          isUploading ? "cursor-wait opacity-50" : ""
        }`}
        aria-label={label || (isUploading ? "Uploading file" : "Attach file")}
      >
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
        )}
        {label ? (isUploading ? "Uploading…" : label) : null}
      </label>
    </>
  );
}
