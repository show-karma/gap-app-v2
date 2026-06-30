"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  useDonorPersona,
  useRefineDonorPersona,
  useUpdateDonorPersona,
} from "@/hooks/useDonorPersona";
import {
  DonorPersonaRateLimitError,
  type UpdateDonorPersonaInput,
} from "@/services/donor-research.service";
import type {
  DonorPersona,
  PersonaStructured,
  PersonaStructuredField,
} from "@/types/donor-research";
import { PersonaNarrativePane } from "./PersonaNarrativePane";
import { PersonaStructuredChips } from "./PersonaStructuredChips";
import { RefineButton } from "./RefineButton";

const MAX_SOURCE_LENGTH = 20000;
const REFINED_INDICATOR_MS = 5000;

const EMPTY_STRUCTURED: PersonaStructured = {
  orgMaturity: { value: null, source: null },
  geoRadius: { value: null, source: null },
  faithStance: { value: null, source: null },
  giftSizeBand: { value: null, source: null },
  advocacyStance: { value: null, source: null },
};

/** Maps a chip field to the PUT input shape (drops source on a cleared chip). */
function toChipInput(field: PersonaStructuredField<string>) {
  return field.value === null
    ? { value: null }
    : { value: field.value, source: field.source ?? ("manual" as const) };
}

function toastError(err: unknown) {
  if (err instanceof DonorPersonaRateLimitError) {
    toast.error(err.message);
    return;
  }
  toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
}

interface PersonaEditorProps {
  handleId: string;
  /**
   * Notified whenever the editor's unsaved-edits flag flips. Lets a host
   * surface (e.g. the creation Sheet) guard against accidental dismissal
   * mid-edit. Optional — the standalone detail page doesn't need it.
   */
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * When provided, renders a secondary "Skip for now" action beside Save (used
   * by the creation modal, where the persona step is optional). Omitted on the
   * standalone detail page.
   */
  onSkip?: () => void;
}

/**
 * The persona authoring surface (U7). Owns the local editor state machine:
 * source text + read-only narrative + five structured chips with provenance,
 * a snapshot of the last refine extraction, and an `isDirty` flag gating Save.
 *
 * Hydration rules: hydrate from the fetched persona on mount and on any
 * background refetch — but only while NOT dirty, so an in-progress edit is
 * never clobbered. A refine writes its result into local state (chips →
 * `extracted`) and marks dirty so Save is enabled even with no manual edit.
 */
export function PersonaEditor({ handleId, onDirtyChange, onSkip }: PersonaEditorProps) {
  const personaQuery = useDonorPersona(handleId);
  const refine = useRefineDonorPersona(handleId);
  const update = useUpdateDonorPersona(handleId);

  const [sourceText, setSourceText] = useState("");
  const [narrative, setNarrative] = useState<string | null>(null);
  const [structured, setStructured] = useState<PersonaStructured>(EMPTY_STRUCTURED);
  const [extractedValues, setExtractedValues] = useState<PersonaStructured | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [justRefined, setJustRefined] = useState(false);

  // Read isDirty inside the hydration effect without making it a dependency
  // (we hydrate on data changes, not on every keystroke flipping dirty).
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const hydrate = useCallback((persona: DonorPersona | null | undefined) => {
    setSourceText(persona?.sourceText ?? "");
    setNarrative(persona?.narrative ?? null);
    setStructured(persona?.structured ?? EMPTY_STRUCTURED);
  }, []);

  const personaData = personaQuery.data;
  const personaLoading = personaQuery.isLoading;
  useEffect(() => {
    if (personaLoading) return;
    if (isDirtyRef.current) return; // never clobber in-progress edits
    hydrate(personaData);
  }, [personaData, personaLoading, hydrate]);

  // Surface dirty transitions to an optional host (creation Sheet) so it can
  // confirm before discarding mid-edit.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Fade the "Refined just now" indicator after a few seconds.
  useEffect(() => {
    if (!justRefined) return;
    const timer = setTimeout(() => setJustRefined(false), REFINED_INDICATOR_MS);
    return () => clearTimeout(timer);
  }, [justRefined]);

  const onSourceChange = (value: string) => {
    setSourceText(value);
    setIsDirty(true);
  };

  const onRefine = () => {
    refine.mutate(sourceText, {
      onSuccess: (result) => {
        setNarrative(result.narrative);
        setStructured(result.structured);
        setExtractedValues(result.structured);
        setIsDirty(true);
        setAnnouncement("Persona narrative updated");
        setJustRefined(true);
      },
      onError: toastError,
    });
  };

  // Stable identity so the memoized chip rows aren't redrawn every render.
  const onChipChange = useCallback((key: keyof PersonaStructured, value: string | null) => {
    setStructured((prev) => ({
      ...prev,
      [key]: { value, source: value === null ? null : "manual" },
    }));
    setIsDirty(true);
  }, []);

  const onResetToExtraction = () => {
    if (!extractedValues) return;
    setStructured(extractedValues);
    setIsDirty(true);
  };

  const onSave = () => {
    const input: UpdateDonorPersonaInput = {
      sourceText: sourceText.length ? sourceText : null,
      narrative,
      structured: {
        orgMaturity: toChipInput(structured.orgMaturity),
        geoRadius: toChipInput(structured.geoRadius),
        faithStance: toChipInput(structured.faithStance),
        giftSizeBand: toChipInput(structured.giftSizeBand),
        advocacyStance: toChipInput(structured.advocacyStance),
      },
    };
    update.mutate(input, {
      onSuccess: (saved) => {
        hydrate(saved);
        setIsDirty(false);
        toast.success("Persona saved");
      },
      // Rollback is handled by the mutation hook; isDirty stays true so the
      // Save button remains an actionable retry.
      onError: toastError,
    });
  };

  if (personaLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (personaQuery.isError) {
    return (
      <div className="rounded-md border border-border p-4 text-sm">
        <p className="mb-2 text-red-600 dark:text-red-400">Couldn't load the persona.</p>
        <button
          type="button"
          onClick={() => personaQuery.refetch()}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Source text */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="persona-source" className="text-sm font-medium">
          Persona source
        </label>
        <p className="text-xs text-muted-foreground">
          Paste donor letters, kickoff notes, anything that describes this donor. Refined and used
          by research.
        </p>
        <textarea
          id="persona-source"
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
          maxLength={MAX_SOURCE_LENGTH}
          rows={8}
          placeholder="What do you know about this donor?"
          className="max-h-[60vh] w-full resize-y overflow-y-auto rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <span className="self-end text-xs text-muted-foreground">
          {sourceText.length} / {MAX_SOURCE_LENGTH}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <RefineButton sourceText={sourceText} isRefining={refine.isPending} onRefine={onRefine} />
        {justRefined ? (
          <span className="text-xs text-muted-foreground transition-opacity">Refined just now</span>
        ) : null}
      </div>

      <PersonaNarrativePane narrative={narrative} announcement={announcement} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Structured profile</span>
          {extractedValues ? (
            <button
              type="button"
              onClick={onResetToExtraction}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Reset to AI extraction
            </button>
          ) : null}
        </div>
        <PersonaStructuredChips structured={structured} onChange={onChipChange} />
      </div>

      {/* Save — sticky to the viewport bottom on narrow screens. An optional
          "Skip for now" sits beside it when the host (creation modal) treats
          the persona step as optional. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="order-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted sm:order-1"
          >
            Skip for now
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || update.isPending}
          className="order-1 w-full rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:order-2 sm:w-auto"
        >
          {update.isPending ? "Saving persona…" : "Save persona"}
        </button>
      </div>
    </div>
  );
}
