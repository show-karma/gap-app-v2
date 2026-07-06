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
  RefinementResult,
} from "@/types/donor-research";
import { PersonaStructuredChips } from "./PersonaStructuredChips";
import { RefineButton } from "./RefineButton";

const MAX_SOURCE_LENGTH = 20000;

const EMPTY_STRUCTURED: PersonaStructured = {
  orgMaturity: { value: null, source: null },
  geoRadius: { value: null, source: null },
  faithStance: { value: null, source: null },
  giftSizeBand: { value: null, source: null },
  advocacyStance: { value: null, source: null },
};

const CHIP_KEYS = [
  "orgMaturity",
  "geoRadius",
  "faithStance",
  "giftSizeBand",
  "advocacyStance",
] as const;

/** Maps a set chip (value present) to its PUT shape, defaulting the source. */
function toChipInput(field: PersonaStructuredField<string>) {
  return { value: field.value, source: field.source ?? ("manual" as const) };
}

/**
 * Surfaces a persona mutation error. A rate-limit error carries a curated,
 * actionable message; everything else shows a friendly, context-specific
 * fallback rather than leaking a raw backend validation string to the user.
 */
function toastError(err: unknown, fallback: string) {
  toast.error(err instanceof DonorPersonaRateLimitError ? err.message : fallback);
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
  /** Called after a successful save — lets the host modal close itself. */
  onSaved?: () => void;
}

/**
 * The persona authoring surface (U7). A single persona text field drives the
 * whole flow: the advisor writes what they know and Refine writes the
 * recommended narrative straight INTO the field (still editable), with an
 * Accept/Reject bar attached under it. Accept keeps the field text (including
 * any hand-tweaks to the suggestion) and applies the extracted chips/scalars;
 * Reject restores the pre-refine text and discards the extraction. While the
 * decision is pending, Refine and Save are hidden/disabled but the field stays
 * editable so the suggestion can be tweaked in place.
 *
 * Because the field is the persona (not just raw notes), hydration prefers the
 * saved narrative over the raw source, and Save persists the field text as
 * BOTH `sourceText` and — once a narrative has ever been accepted — `narrative`,
 * so hand-tweaks after accepting flow through to research.
 *
 * Hydration rules: hydrate from the fetched persona on mount and on any
 * background refetch — but only while NOT dirty, so an in-progress edit is
 * never clobbered.
 */
export function PersonaEditor({ handleId, onDirtyChange, onSkip, onSaved }: PersonaEditorProps) {
  const personaQuery = useDonorPersona(handleId);
  const refine = useRefineDonorPersona(handleId);
  const update = useUpdateDonorPersona(handleId);

  const [personaText, setPersonaText] = useState("");
  // True once the persona has an accepted/saved narrative — gates whether Save
  // writes the field text into `narrative` too (raw never-refined notes stay
  // sourceText-only so research doesn't treat them as a finished persona).
  const [hasNarrative, setHasNarrative] = useState(false);
  const [recommendation, setRecommendation] = useState<RefinementResult | null>(null);
  // What the field held before Refine wrote the suggestion into it — restored
  // verbatim on Reject.
  const [preRefineText, setPreRefineText] = useState("");
  const [structured, setStructured] = useState<PersonaStructured>(EMPTY_STRUCTURED);
  const [extractedValues, setExtractedValues] = useState<PersonaStructured | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Refine-extracted scalars. Not edited here — carried through so they persist
  // on save and then prefill the report form (amounts/cause/geography).
  const [amountMin, setAmountMin] = useState<number | null>(null);
  const [amountMax, setAmountMax] = useState<number | null>(null);
  const [cause, setCause] = useState<string | null>(null);
  const [geography, setGeography] = useState<string | null>(null);

  // Read isDirty inside the hydration effect without making it a dependency
  // (we hydrate on data changes, not on every keystroke flipping dirty).
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const hydrate = useCallback((persona: DonorPersona | null | undefined) => {
    // The single field shows the persona itself: the accepted narrative when
    // one exists, otherwise the raw source notes.
    setPersonaText(persona?.narrative ?? persona?.sourceText ?? "");
    setHasNarrative(persona?.narrative != null);
    setStructured(persona?.structured ?? EMPTY_STRUCTURED);
    setAmountMin(persona?.amountMin ?? null);
    setAmountMax(persona?.amountMax ?? null);
    setCause(persona?.cause ?? null);
    setGeography(persona?.geography ?? null);
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

  const onPersonaTextChange = (value: string) => {
    setPersonaText(value);
    setIsDirty(true);
  };

  const onRefine = () => {
    refine.mutate(personaText, {
      onSuccess: (result) => {
        // A refine that extracts nothing (no narrative, no chips, no scalars)
        // has nothing to recommend — leave the editor untouched and tell the
        // user to add more detail.
        const extractedNothing =
          !result.narrative &&
          result.amountMin == null &&
          result.amountMax == null &&
          !result.cause &&
          !result.geography &&
          Object.values(result.structured).every((chip) => chip.value === null);
        if (extractedNothing) {
          toast.error(
            "Refine couldn't pull anything from these notes. Add more detail and try again."
          );
          return;
        }
        // Write the suggestion straight into the field (kept editable) and
        // remember what it replaced so Reject can restore it.
        setPreRefineText(personaText);
        if (result.narrative) setPersonaText(result.narrative);
        setRecommendation(result);
        // Mark dirty while the suggestion is pending: it blocks the hydration
        // effect from clobbering the in-field suggestion on a background
        // refetch, and arms the host's discard guard against dismissal.
        setIsDirty(true);
        setAnnouncement("Recommended persona written to the input — accept or reject below");
      },
      onError: (err) => toastError(err, "Couldn't refine the persona. Try again."),
    });
  };

  const onAcceptRecommendation = () => {
    if (!recommendation) return;
    // The field already holds the suggestion (possibly hand-tweaked) — keep it
    // as-is and apply the extracted chips/scalars.
    if (recommendation.narrative) setHasNarrative(true);
    setStructured(recommendation.structured);
    setExtractedValues(recommendation.structured);
    setAmountMin(recommendation.amountMin ?? null);
    setAmountMax(recommendation.amountMax ?? null);
    setCause(recommendation.cause ?? null);
    setGeography(recommendation.geography ?? null);
    setRecommendation(null);
    setIsDirty(true);
    setAnnouncement("Recommended persona accepted");
  };

  const onRejectRecommendation = () => {
    setPersonaText(preRefineText);
    setRecommendation(null);
    setAnnouncement("Recommendation discarded — your original text was restored");
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
    // Send only the chips that carry a value. The backend's PUT schema validates
    // each `structured.*.value` against the chip enum and REJECTS null, so an
    // unset chip must be omitted (omit = preserve) — sending it as `{ value: null }`
    // 400s the whole save, and a fresh persona has five unset chips. (Clearing a
    // previously-set chip therefore needs backend support for null-to-clear.)
    const structuredInput: NonNullable<UpdateDonorPersonaInput["structured"]> = {};
    for (const key of CHIP_KEYS) {
      const field = structured[key];
      if (field.value !== null) structuredInput[key] = toChipInput(field);
    }

    const text = personaText.length ? personaText : null;
    const input: UpdateDonorPersonaInput = {
      sourceText: text,
      narrative: hasNarrative ? text : null,
      // Persist the refine-extracted scalars so they survive the save and
      // prefill the report form (this was the missing link: refine returned
      // them but the PUT dropped them, so the GET came back null).
      amountMin,
      amountMax,
      cause,
      geography,
      ...(Object.keys(structuredInput).length > 0 ? { structured: structuredInput } : {}),
    };
    update.mutate(input, {
      onSuccess: (saved) => {
        hydrate(saved);
        setIsDirty(false);
        toast.success("Persona saved");
        onSaved?.();
      },
      // Rollback is handled by the mutation hook; isDirty stays true so the
      // Save button remains an actionable retry.
      onError: (err) => toastError(err, "Couldn't save the persona. Try again."),
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

  const isReviewing = recommendation !== null;

  return (
    <div className="flex flex-col gap-5">
      {/* Persona text — the one input. Locked while a recommendation awaits a decision. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="persona-source" className="text-sm font-medium">
          Persona source
        </label>
        <p className="text-xs text-muted-foreground">
          Paste donor letters, kickoff notes, anything that describes this donor — then click Refine
          to get a recommended persona.
        </p>
        <div className="relative">
          <textarea
            id="persona-source"
            value={personaText}
            onChange={(e) => onPersonaTextChange(e.target.value)}
            maxLength={MAX_SOURCE_LENGTH}
            rows={8}
            placeholder="What do you know about this donor?"
            className={`block max-h-[60vh] w-full overflow-y-auto rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-border focus:outline-none focus:ring-0 ${
              isReviewing ? "resize-none pb-14" : "resize-y"
            }`}
          />
          {/* While a suggestion sits in the field, the decision bar floats
              INSIDE the input, anchored to its bottom edge (the textarea gets
              matching bottom padding and its resize handle is disabled so the
              buttons never overlap content or the grip). Accept keeps the
              (editable) text, Reject restores what was there before. */}
          {isReviewing ? (
            <div className="absolute inset-x-px bottom-px flex flex-wrap items-center justify-between gap-2 rounded-b-md bg-background/90 px-3 py-2">
              <span className="text-xs font-medium text-primary">
                {recommendation.narrative
                  ? "Recommended persona"
                  : "No narrative was generated, but donor details were extracted"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRejectRecommendation}
                  className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={onAcceptRecommendation}
                  className="rounded-md border border-border bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                >
                  Accept
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {/* Char counter (left) and Refine (right) share one row under the input. */}
        {isReviewing ? null : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {personaText.length} / {MAX_SOURCE_LENGTH}
            </span>
            <RefineButton
              sourceText={personaText}
              isRefining={refine.isPending}
              onRefine={onRefine}
            />
          </div>
        )}
      </div>

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>

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
          disabled={!isDirty || isReviewing || update.isPending}
          className="order-1 w-full rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:order-2 sm:w-auto"
        >
          {update.isPending ? "Saving persona…" : "Save persona"}
        </button>
      </div>
    </div>
  );
}
