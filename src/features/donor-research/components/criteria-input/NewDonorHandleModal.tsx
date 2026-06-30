"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateDonorHandle } from "@/hooks/useDonorHandles";
import type { DonorHandle } from "@/types/donor-research";
import { HandleNotesSection } from "../donor-detail/HandleNotesSection";

// Keep the persona editor (narrative pane, refine, structured chips) out of the
// research page's initial bundle — it only loads when the advisor reaches the
// persona step.
const PersonaEditor = dynamic(
  () => import("../donor-detail/PersonaEditor").then((m) => m.PersonaEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
      </div>
    ),
  }
);

const MAX_LABEL_LENGTH = 120;

interface NewDonorHandleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fired as soon as a handle is created. The parent selects it in the criteria
   * picker so the advisor lands on the new handle. Not called when editing an
   * existing handle.
   */
  onCreated: (handleId: string) => void;
  /**
   * When provided (and `open`), the modal opens straight into the persona
   * editor for this existing handle, pre-filled — the "edit persona" path from
   * the picker's gear. Omitted for the create flow.
   */
  editHandle?: DonorHandle | null;
}

/**
 * Donor-handle creation + persona editing in one compact centered modal.
 *
 *  - Create: Step 1 names the handle ("Just create handle" or "Create & add
 *    persona"); Step 2 is the persona editor + private notes.
 *  - Edit: opens directly on the persona editor for an existing handle,
 *    pre-filled from its saved persona.
 *
 * In both modes the AI narrative is generated (read-only); the source text,
 * structured chips, and notes are hand-editable. Dismissal is guarded only
 * while the persona has unsaved edits.
 */
export function NewDonorHandleModal({
  open,
  onOpenChange,
  onCreated,
  editHandle,
}: NewDonorHandleModalProps) {
  const createHandle = useCreateDonorHandle();

  const [step, setStep] = useState<1 | 2>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<DonorHandle | null>(null);
  const [personaDirty, setPersonaDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Initialise the flow each time the modal opens: straight to the persona
  // editor when editing, or the name step when creating.
  useEffect(() => {
    if (!open) return;
    setLabel("");
    setCreateError(null);
    setPersonaDirty(false);
    setConfirmDiscard(false);
    if (editHandle) {
      setIsEditing(true);
      setActiveHandle(editHandle);
      setStep(2);
    } else {
      setIsEditing(false);
      setActiveHandle(null);
      setStep(1);
    }
  }, [open, editHandle]);

  const labelInputRef = useRef<HTMLInputElement>(null);

  const onPersonaDirtyChange = useCallback((dirty: boolean) => setPersonaDirty(dirty), []);

  const trimmedLabel = label.trim();

  // Creates the handle, then either advances to the persona step or closes.
  const createAndContinue = async (advance: boolean) => {
    if (!trimmedLabel || createHandle.isPending) return;
    try {
      setCreateError(null);
      const handle = await createHandle.mutateAsync({ opaqueLabel: trimmedLabel });
      setActiveHandle(handle);
      onCreated(handle.id);
      if (advance) {
        setStep(2);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create the handle. Try again.");
    }
  };

  // Single gate for every dismissal path (X button, Esc, overlay click). On the
  // persona step with unsaved edits we hold the modal open and ask first.
  const requestClose = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (step === 2 && personaDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const discardAndClose = () => {
    setConfirmDiscard(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      {step === 1 && !isEditing ? (
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            labelInputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>New donor handle</DialogTitle>
            <DialogDescription>
              Name the anonymous label you'll use to track research for this donor. You can add a
              persona next.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-handle-label" className="text-sm font-medium">
              Handle name
            </label>
            <input
              id="new-handle-label"
              ref={labelInputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createAndContinue(true);
                }
              }}
              maxLength={MAX_LABEL_LENGTH}
              placeholder="e.g. Smith Family Q3"
              aria-label="New donor handle name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {createError ? (
              <span className="text-xs text-red-600 dark:text-red-400">{createError}</span>
            ) : null}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => createAndContinue(false)}
              disabled={!trimmedLabel || createHandle.isPending}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Just create handle
            </button>
            <button
              type="button"
              onClick={() => createAndContinue(true)}
              disabled={!trimmedLabel || createHandle.isPending}
              className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createHandle.isPending ? "Creating…" : "Create & add persona"}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : activeHandle ? (
        <DialogContent
          className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
          // The persona editor hosts portaled widgets (the Radix Select chips)
          // and is a multi-field form with unsaved work. Radix can misclassify a
          // pointerdown on a portaled/in-content element as an "outside"
          // interaction, which fires the dirty-close guard on every mouse click
          // (QA: the editor became mouse-unusable, keyboard-only). Disable
          // close-on-outside-interaction entirely — the X button and Escape
          // still route through requestClose() and prompt to discard.
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-border px-6 py-4 pr-12 text-left">
            {isEditing ? (
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Edit persona
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                  <span className="h-1.5 w-6 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Step 2 of 2 · Persona
                </span>
              </div>
            )}
            <DialogTitle>
              {isEditing
                ? `Edit ${activeHandle.opaqueLabel}'s persona`
                : `Set up ${activeHandle.opaqueLabel}'s persona`}
            </DialogTitle>
            <DialogDescription>
              Add what you know about this donor and refine it into a persona. The AI narrative is
              generated for you; the source, structured profile, and notes are yours to edit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-8">
              <HandleNotesSection handle={activeHandle} />
              <PersonaEditor
                key={activeHandle.id}
                handleId={activeHandle.id}
                onDirtyChange={onPersonaDirtyChange}
                onSkip={isEditing ? undefined : () => onOpenChange(false)}
                onSaved={() => onOpenChange(false)}
              />
            </div>
          </div>
        </DialogContent>
      ) : null}

      <Dialog
        open={confirmDiscard}
        onOpenChange={(value) => {
          if (!value) setConfirmDiscard(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard persona changes?</DialogTitle>
            <DialogDescription>
              Your unsaved changes to {activeHandle?.opaqueLabel ?? "this handle"}'s persona will be
              lost. You can edit it again anytime from the donor handle picker.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={discardAndClose}
              className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Discard
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
