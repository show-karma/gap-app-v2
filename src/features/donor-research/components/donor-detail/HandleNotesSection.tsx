"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useUpdateDonorHandle } from "@/hooks/useDonorHandles";
import type { DonorHandle } from "@/types/donor-research";

interface HandleNotesSectionProps {
  handle: DonorHandle;
  /**
   * Reports unsaved-notes state up so the persona page's discard guard covers
   * this section too — otherwise editing Notes (without saving) and navigating
   * away drops the edit with no confirmation.
   */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * The private "Notes" section of the donor detail page — free text the
 * advisor keeps on the handle that is NOT fed to research (distinct from the
 * persona source). Optimistic save via {@link useUpdateDonorHandle}.
 */
export function HandleNotesSection({ handle, onDirtyChange }: HandleNotesSectionProps) {
  const [notes, setNotes] = useState(handle.notes ?? "");
  const update = useUpdateDonorHandle(handle.id);

  // After a successful save the handle prop refreshes to the saved notes, so
  // dirty naturally returns to false without resetting local state.
  const isDirty = notes !== (handle.notes ?? "");

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const onSave = () => {
    update.mutate(
      { notes: notes.length ? notes : null },
      {
        onSuccess: () => toast.success("Description saved"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Couldn't save the description. Try again."
          ),
      }
    );
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">Description</h2>
      <p className="text-xs text-muted-foreground">
        Your own reminders about this donor. Never sent to the research model.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        aria-label="Donor description"
        placeholder="e.g. Prefers email; introduced by the board chair."
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={!isDirty || update.isPending}
        className="self-start"
      >
        {update.isPending ? "Saving…" : "Save description"}
      </Button>
    </section>
  );
}
