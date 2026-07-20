"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { BTN_BASE, BTN_MD, BTN_OUTLINE } from "@/components/Pages/Dashboard/v3/soft-classes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DonorHandle } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";

interface DonorHandlePickerProps {
  handles: DonorHandle[];
  loading: boolean;
  value: string;
  onChange: (handleId: string) => void;
  /**
   * Opens the create flow (the quick-create dialog, owned by the parent).
   * Both the first-run CTA and the "+ New persona" shortcut delegate here so
   * creation lives in one place and the new handle can be auto-selected.
   */
  onRequestCreate: () => void;
  /** Opens the selected persona editor without leaving the report. */
  onRequestEdit: (handleId: string) => void;
  /** Controls whether the in-place action says Add or Change profile. */
  personaExists?: boolean | null;
  error?: string;
}

/**
 * Combobox-style picker (U13a). Renders the existing donor handles as a
 * select; creation and persona editing are delegated to the parent's dialog so
 * the advisor never loses the report criteria already entered on this page.
 *
 * Three states honored:
 *  - loading: skeleton
 *  - empty: explicit "create your first persona" CTA → opens the dialog
 *  - error: surfaced inline via the parent's `error` prop
 */
export function DonorHandlePicker({
  handles,
  loading,
  value,
  onChange,
  onRequestCreate,
  onRequestEdit,
  personaExists,
  error,
}: DonorHandlePickerProps) {
  const empty = !loading && handles.length === 0;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <p className="text-xs text-muted-foreground">
        Anonymous label you use to track research for this donor.
      </p>

      {loading ? (
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      ) : empty ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            No personas yet. Create one to scope your research.
          </p>
          <Button size="sm" onClick={onRequestCreate} type="button">
            Create your first persona
          </Button>
        </div>
      ) : (
        <ExistingHandlesRow
          handles={handles}
          onChange={onChange}
          onCreate={onRequestCreate}
          onEdit={onRequestEdit}
          personaExists={personaExists}
          value={value}
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
  onEdit: (handleId: string) => void;
  personaExists?: boolean | null;
}

/**
 * The populated-state row: a shadcn/Radix Select, a "+ New persona" shortcut,
 * and (when a handle is selected) an in-place profile action. Every control
 * shares the Soft dashboard's 42px control height.
 */
function ExistingHandlesRow({
  handles,
  value,
  onChange,
  onCreate,
  onEdit,
  personaExists,
}: ExistingHandlesRowProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const selectedLabel =
    handles.find((handle) => handle.id === value)?.opaqueLabel ?? "selected persona";

  return (
    <div className="flex flex-col gap-2 sm:flex-row" ref={setPortalContainer}>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger
          aria-label="Persona"
          className="h-[42px] min-w-0 flex-1 rounded-sf-tile border-sf-line-strong bg-sf-elev px-3 text-[13.5px] text-sf-heading shadow-none focus:ring-brand-500/20"
        >
          <SelectValue placeholder="Select a persona…" />
        </SelectTrigger>
        <SelectContent
          className="rounded-sf-tile border-sf-line bg-sf-card text-sf-heading shadow-sf-card"
          container={portalContainer}
        >
          {handles.map((handle) => (
            <SelectItem
              className="rounded-md text-[13px] focus:bg-sf-elev focus:text-sf-heading"
              key={handle.id}
              value={handle.id}
            >
              {handle.opaqueLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value ? (
        <button
          aria-label={`${personaExists ? "Change" : "Add"} profile for ${selectedLabel}`}
          className={cn(
            BTN_BASE,
            BTN_MD,
            BTN_OUTLINE,
            personaExists ? "w-[42px] px-0" : "w-full sm:w-auto"
          )}
          onClick={() => onEdit(value)}
          title={personaExists ? `Change profile for ${selectedLabel}` : undefined}
          type="button"
        >
          {personaExists ? <Settings aria-hidden="true" className="h-4 w-4" /> : "Add profile"}
        </button>
      ) : null}
      <button
        className={cn(BTN_BASE, BTN_MD, BTN_OUTLINE, "w-full sm:w-auto")}
        onClick={onCreate}
        type="button"
      >
        + New persona
      </button>
    </div>
  );
}
