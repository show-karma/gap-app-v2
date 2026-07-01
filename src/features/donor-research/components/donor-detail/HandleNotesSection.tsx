"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useUpdateDonorHandle } from "@/hooks/useDonorHandles";
import type { DonorHandle } from "@/types/donor-research";

interface HandleNotesSectionProps {
  handle: DonorHandle;
}

/**
 * The private "Notes" section of the donor detail page — free text the
 * advisor keeps on the handle that is NOT fed to research (distinct from the
 * persona source). Optimistic save via {@link useUpdateDonorHandle}.
 */
export function HandleNotesSection({ handle }: HandleNotesSectionProps) {
  const [notes, setNotes] = useState(handle.notes ?? "");
  const update = useUpdateDonorHandle(handle.id);

  // After a successful save the handle prop refreshes to the saved notes, so
  // dirty naturally returns to false without resetting local state.
  const isDirty = notes !== (handle.notes ?? "");

  const onSave = () => {
    update.mutate(
      { notes: notes.length ? notes : null },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Couldn't save notes. Try again."),
      }
    );
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">Notes — private, not used by research</h2>
      <p className="text-xs text-muted-foreground">
        Your own reminders about this donor. Never sent to the research model.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        aria-label="Private handle notes"
        placeholder="e.g. Prefers email; introduced by the board chair."
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || update.isPending}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {update.isPending ? "Saving…" : "Save notes"}
      </button>
    </section>
  );
}
