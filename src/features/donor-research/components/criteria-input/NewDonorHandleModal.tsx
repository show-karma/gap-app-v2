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
// research page's initial bundle — it only loads if the advisor opts into the
// optional persona step.
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
   * Fired as soon as the handle is created. The parent selects it in the
   * criteria picker so the advisor lands on the new handle whether or not they
   * go on to fill in the (optional) persona.
   */
  onCreated: (handleId: string) => void;
}

/**
 * Donor-handle creation flow, presented as a compact centered modal on the
 * research page.
 *
 *  - Step 1 — Name: a single field. The advisor can "Just create handle" and
 *    stop there, or "Create & add persona" to continue.
 *  - Step 2 — Persona (optional): the persona editor + private notes in a
 *    roomy-but-bounded modal, keyed to the freshly-created handle. Closing it
 *    is fine — the handle is already saved and selected.
 *
 * Dismissal is only guarded while the persona has unsaved edits, so typed work
 * isn't lost by an accidental close.
 */
export function NewDonorHandleModal({ open, onOpenChange, onCreated }: NewDonorHandleModalProps) {
  const createHandle = useCreateDonorHandle();

  const [step, setStep] = useState<1 | 2>(1);
  const [label, setLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdHandle, setCreatedHandle] = useState<DonorHandle | null>(null);
  const [personaDirty, setPersonaDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Reset the flow each time the modal opens so a reopened modal never shows a
  // stale step or a previous handle's editor.
  useEffect(() => {
    if (open) {
      setStep(1);
      setLabel("");
      setCreateError(null);
      setCreatedHandle(null);
      setPersonaDirty(false);
      setConfirmDiscard(false);
    }
  }, [open]);

  const labelInputRef = useRef<HTMLInputElement>(null);

  const onPersonaDirtyChange = useCallback((dirty: boolean) => setPersonaDirty(dirty), []);

  const trimmedLabel = label.trim();

  // Creates the handle, then either advances to the optional persona step or
  // closes outright.
  const createAndContinue = async (advance: boolean) => {
    if (!trimmedLabel || createHandle.isPending) return;
    try {
      setCreateError(null);
      const handle = await createHandle.mutateAsync({ opaqueLabel: trimmedLabel });
      setCreatedHandle(handle);
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
      {step === 1 ? (
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
              persona next — it's optional.
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
      ) : createdHandle ? (
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12 text-left">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Persona · optional
            </span>
            <DialogTitle>Set up {createdHandle.opaqueLabel}'s persona</DialogTitle>
            <DialogDescription>
              Add what you know about this donor, refine it into a persona, and save — or close and
              do this later from the handle's page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-8">
              <HandleNotesSection handle={createdHandle} />
              <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">
                  Persona source — refined and used by research
                </h2>
                <PersonaEditor
                  key={createdHandle.id}
                  handleId={createdHandle.id}
                  onDirtyChange={onPersonaDirtyChange}
                />
              </section>
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
              {createdHandle?.opaqueLabel ? `"${createdHandle.opaqueLabel}"` : "This handle"} is
              already saved and selected for your report. Your unsaved persona edits will be lost —
              you can finish the persona later from the handle's page.
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
