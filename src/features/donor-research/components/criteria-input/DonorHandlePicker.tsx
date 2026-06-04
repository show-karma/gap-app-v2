"use client";

import { useState } from "react";
import { useCreateDonorHandle } from "@/hooks/useDonorHandles";
import type { DonorHandle } from "@/types/donor-research";

interface DonorHandlePickerProps {
  handles: DonorHandle[];
  loading: boolean;
  value: string;
  onChange: (handleId: string) => void;
  error?: string;
}

/**
 * Combobox-style picker (U13a). Renders the existing donor handles as a
 * select, with an inline "create new handle" form below for the
 * advisor's first run when no handles exist yet.
 *
 * Three states honored:
 *  - loading: skeleton
 *  - empty: explicit "create your first handle" CTA
 *  - error: surfaced inline via the parent's `error` prop
 */
export function DonorHandlePicker({
  handles,
  loading,
  value,
  onChange,
  error,
}: DonorHandlePickerProps) {
  const createHandle = useCreateDonorHandle();
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const empty = !loading && handles.length === 0;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Donor handle</span>
      <p className="text-xs text-muted-foreground">
        Anonymous label you use to track research for this donor.
      </p>

      {loading ? (
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      ) : empty && !creating ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            No donor handles yet. Create one to scope your research.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Create your first handle
          </button>
        </div>
      ) : creating ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Smith Family Q3"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {createError ? <span className="text-xs text-red-600">{createError}</span> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  setCreateError(null);
                  const handle = await createHandle.mutateAsync({
                    opaqueLabel: newLabel.trim(),
                  });
                  onChange(handle.id);
                  setCreating(false);
                  setNewLabel("");
                } catch (err) {
                  setCreateError((err as Error)?.message || "Couldn't create handle");
                }
              }}
              disabled={!newLabel.trim() || createHandle.isPending}
              className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createHandle.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewLabel("");
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
            onClick={() => setCreating(true)}
            className="whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            + New handle
          </button>
        </div>
      )}

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
