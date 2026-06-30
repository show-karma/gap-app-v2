"use client";

import { Settings } from "lucide-react";
import type { DonorHandle } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";

interface DonorHandlePickerProps {
  handles: DonorHandle[];
  loading: boolean;
  value: string;
  onChange: (handleId: string) => void;
  /**
   * Opens the create flow (the persona-creation Sheet, owned by the parent).
   * Both the first-run CTA and the "+ New handle" shortcut delegate here so
   * creation lives in one place and the new handle can be auto-selected.
   */
  onRequestCreate: () => void;
  error?: string;
}

/**
 * Combobox-style picker (U13a). Renders the existing donor handles as a
 * select; creation is delegated to the parent's Sheet via `onRequestCreate`.
 *
 * Three states honored:
 *  - loading: skeleton
 *  - empty: explicit "create your first handle" CTA → opens the Sheet
 *  - error: surfaced inline via the parent's `error` prop
 */
export function DonorHandlePicker({
  handles,
  loading,
  value,
  onChange,
  onRequestCreate,
  error,
}: DonorHandlePickerProps) {
  const empty = !loading && handles.length === 0;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Donor handle</span>
      <p className="text-xs text-muted-foreground">
        Anonymous label you use to track research for this donor.
      </p>

      {loading ? (
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      ) : empty ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            No donor handles yet. Create one to scope your research.
          </p>
          <button
            type="button"
            onClick={onRequestCreate}
            className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Create your first handle
          </button>
        </div>
      ) : (
        <ExistingHandlesRow
          handles={handles}
          value={value}
          onChange={onChange}
          onCreate={onRequestCreate}
        />
      )}

      {error ? <span className="text-xs text-red-600 dark:text-red-400">{error}</span> : null}
    </div>
  );
}

interface ExistingHandlesRowProps {
  handles: DonorHandle[];
  value: string;
  onChange: (handleId: string) => void;
  onCreate: () => void;
}

/**
 * The populated-state row: a native handle `<select>`, a "+ New handle"
 * shortcut, and (when a handle is selected) a "Manage" link that opens the
 * donor detail page in a new tab so the in-progress report form is preserved.
 */
function ExistingHandlesRow({ handles, value, onChange, onCreate }: ExistingHandlesRowProps) {
  const selectedLabel =
    handles.find((handle) => handle.id === value)?.opaqueLabel ?? "Untitled donor handle";

  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Donor handle"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Select a donor handle…
        </option>
        {handles.map((handle) => (
          <option key={handle.id} value={handle.id}>
            {handle.opaqueLabel}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onCreate}
        className="whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
      >
        + New handle
      </button>
      {value ? (
        <a
          href={PAGES.DONOR_RESEARCH.DONOR_DETAIL(value)}
          target="_blank"
          rel="noopener"
          aria-label={`Manage donor handle ${selectedLabel}`}
          title="Manage donor handle"
          className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
