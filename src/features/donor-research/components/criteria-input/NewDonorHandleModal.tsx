"use client";

import dynamic from "next/dynamic";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
// report page's initial bundle — it loads only when the advisor chooses to add
// or change a persona.
const PersonaEditor = dynamic(
  () => import("../donor-detail/PersonaEditor").then((module) => module.PersonaEditor),
  {
    ssr: false,
    loading: () => (
      <div aria-busy="true" className="flex flex-col gap-4">
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
  /** Fired as soon as a persona is created so the report picker can select it. */
  onCreated?: (handleId: string) => void;
  /** Opens directly into an existing saved persona. */
  editHandle?: DonorHandle | null;
  /** Distinguishes first-time profile authoring from changing a saved profile. */
  editPersonaExists?: boolean | null;
}

interface PersonaNameStepProps {
  canCreate: boolean;
  createError: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  pending: boolean;
  onCreateOnly: () => void;
  onCreateWithPersona: () => void;
  onLabelChange: (label: string) => void;
}

function PersonaNameStep({
  canCreate,
  createError,
  inputRef,
  label,
  pending,
  onCreateOnly,
  onCreateWithPersona,
  onLabelChange,
}: PersonaNameStepProps) {
  return (
    <DialogContent
      className="sm:max-w-md"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>New persona</DialogTitle>
        <DialogDescription>
          Add an anonymous persona label, then optionally create the profile that will prefill
          future research.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="new-handle-label">
          Persona name
        </label>
        <input
          aria-label="New persona name"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          id="new-handle-label"
          maxLength={MAX_LABEL_LENGTH}
          onChange={(event) => onLabelChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onCreateWithPersona();
          }}
          placeholder="e.g. Smith Family Q3"
          ref={inputRef}
          value={label}
        />
        {createError ? (
          <span className="text-xs text-red-600 dark:text-red-400">{createError}</span>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          disabled={!canCreate || pending}
          onClick={onCreateOnly}
          type="button"
          variant="outline"
        >
          Create persona only
        </Button>
        <Button disabled={!canCreate || pending} onClick={onCreateWithPersona} type="button">
          {pending ? "Creating…" : "Create & add profile"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface PersonaStepProps {
  editPersonaExists?: boolean | null;
  handle: DonorHandle;
  isEditing: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onFinish: () => void;
}

function PersonaStep({
  editPersonaExists,
  handle,
  isEditing,
  onDirtyChange,
  onFinish,
}: PersonaStepProps) {
  const editAction = editPersonaExists ? "Change" : "Add";
  const eyebrow = isEditing ? `${editAction} profile` : "Step 2 of 2 · Profile";
  const title = isEditing
    ? `${editAction} ${handle.opaqueLabel}'s profile`
    : `Set up ${handle.opaqueLabel}'s profile`;

  return (
    <DialogContent
      className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
      // Persona chips use portaled Radix Selects. Treating those portals as
      // outside clicks would close the editor and lose unsaved changes.
      onInteractOutside={(event) => event.preventDefault()}
      onPointerDownOutside={(event) => event.preventDefault()}
    >
      <DialogHeader className="border-b border-border px-6 py-4 pr-12 text-left">
        <div className="flex items-center gap-2">
          {isEditing ? null : (
            <span aria-hidden className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span className="h-1.5 w-6 rounded-full bg-primary" />
            </span>
          )}
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Describe what you know about this donor, refine the recommendation, and adjust the
          structured profile before saving.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-8">
          <HandleNotesSection handle={handle} />
          <PersonaEditor
            handleId={handle.id}
            key={handle.id}
            onDirtyChange={onDirtyChange}
            onSaved={onFinish}
            onSkip={isEditing ? undefined : onFinish}
          />
        </div>
      </div>
    </DialogContent>
  );
}

interface DiscardPersonaDialogProps {
  personaName?: string;
  onCancel: () => void;
  onDiscard: () => void;
  open: boolean;
}

function DiscardPersonaDialog({
  personaName,
  onCancel,
  onDiscard,
  open,
}: DiscardPersonaDialogProps) {
  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onCancel()} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard profile changes?</DialogTitle>
          <DialogDescription>
            Your unsaved changes to {personaName ?? "this persona"} will be lost. You can edit them
            again from this report or the persona page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel} type="button" variant="outline">
            Keep editing
          </Button>
          <Button onClick={onDiscard} type="button">
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Persona creation and profile authoring in one dialog.
 *
 * Create mode starts with the anonymous persona label, then lets the advisor
 * either finish immediately or continue into the optional profile editor.
 * Edit mode opens the same editor in place, preserving report-form progress.
 */
export function NewDonorHandleModal({
  open,
  onOpenChange,
  onCreated,
  editHandle,
  editPersonaExists,
}: NewDonorHandleModalProps) {
  const createHandle = useCreateDonorHandle();

  const [step, setStep] = useState<1 | 2>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<DonorHandle | null>(null);
  const [personaDirty, setPersonaDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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

  const createAndContinue = async (addPersona: boolean) => {
    if (!trimmedLabel || createHandle.isPending) return;
    try {
      setCreateError(null);
      const handle = await createHandle.mutateAsync({ opaqueLabel: trimmedLabel });
      setActiveHandle(handle);
      onCreated?.(handle.id);
      if (addPersona) {
        setStep(2);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Couldn't create the persona. Try again."
      );
    }
  };

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) {
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

  let activeStep = null;
  if (step === 1 && !isEditing) {
    activeStep = (
      <PersonaNameStep
        canCreate={Boolean(trimmedLabel)}
        createError={createError}
        inputRef={labelInputRef}
        label={label}
        onCreateOnly={() => void createAndContinue(false)}
        onCreateWithPersona={() => void createAndContinue(true)}
        onLabelChange={setLabel}
        pending={createHandle.isPending}
      />
    );
  } else if (activeHandle) {
    activeStep = (
      <PersonaStep
        editPersonaExists={editPersonaExists}
        handle={activeHandle}
        isEditing={isEditing}
        onDirtyChange={onPersonaDirtyChange}
        onFinish={() => onOpenChange(false)}
      />
    );
  }

  return (
    <Dialog onOpenChange={requestClose} open={open}>
      {activeStep}
      <DiscardPersonaDialog
        personaName={activeHandle?.opaqueLabel}
        onCancel={() => setConfirmDiscard(false)}
        onDiscard={discardAndClose}
        open={confirmDiscard}
      />
    </Dialog>
  );
}
