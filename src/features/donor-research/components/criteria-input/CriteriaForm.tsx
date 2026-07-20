"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { type Control, Controller, type FieldErrors, type UseFormReturn } from "react-hook-form";
import toast from "react-hot-toast";
import { BTN_BASE, BTN_MD, BTN_PRIMARY } from "@/components/Pages/Dashboard/v3/soft-classes";
import type { DonorAdvisor, DonorHandle } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import { RateLimitCounter } from "../common/RateLimitCounter";
import { DEFAULT_TOP_COUNT, DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WeightsAllocator } from "../weights/WeightsAllocator";
import { isValidWeights, weightsEqual } from "../weights/weights-allocation";
import type { CriteriaFormValues } from "./CriteriaInputPanel";
import { DonorHandlePicker } from "./DonorHandlePicker";
import { type PersonaPrefillField, PrefilledFromPersonaBadge } from "./PrefilledFromPersonaBadge";

/**
 * Controlled optional-number input. Value-driven (not `register`) so a
 * `form.reset()` that clears the field to `undefined` reliably empties the
 * DOM — an uncontrolled number input keeps its stale value on reset, which
 * left an old amount behind when switching to a persona with an open-ended
 * gift band.
 */
function AmountInput({
  control,
  name,
  id,
  placeholder,
}: {
  control: Control<CriteriaFormValues>;
  name: "amountMin" | "amountMax";
  id: string;
  placeholder: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <input
          id={id}
          type="number"
          min={0}
          name={field.name}
          ref={field.ref}
          onBlur={field.onBlur}
          value={field.value ?? ""}
          onChange={(e) =>
            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder={placeholder}
        />
      )}
    />
  );
}

/** Sf-card section wrapper — the "New report" page is three of these plus a
 * sticky footer (spec 2.3). */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-sf-card border border-sf-line bg-sf-card p-6">
      <div className="flex flex-col gap-[3px]">
        <h2 className="m-0 text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">{title}</h2>
        {description ? <p className="m-0 text-[13px] text-sf-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Collapsed-by-default disclosure for weights + topCount. The content stays
 * mounted so the grid-row and opacity transitions can animate in both
 * directions; `inert` keeps its controls out of keyboard and screen-reader
 * navigation while closed.
 */
function AdvancedDisclosure({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-sf-tile border border-sf-line bg-sf-elev">
      <button
        aria-controls="criteria-advanced-panel"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[13.5px] font-[600] text-sf-heading">
            Advanced: ranking weights &amp; result count
          </span>
          <span className="text-[12px] text-sf-muted">
            Defaults work well for most searches. You can adjust these again after the report
            renders.
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 flex-none text-sf-muted transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            aria-hidden={!open}
            className={cn(
              "flex flex-col gap-5 border-t border-sf-line px-4 pb-4 pt-4 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            )}
            id="criteria-advanced-panel"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CriteriaFormProps {
  form: UseFormReturn<CriteriaFormValues>;
  onSubmit: (values: CriteriaFormValues) => Promise<void> | void;
  handles: DonorHandle[];
  handlesLoading: boolean;
  submitting: boolean;
  /** Non-null once the create mutation fails; rendered above the footer's submit button. */
  submitError?: string | null;
  /** The signed-in advisor, when resolved — feeds the sticky footer's rate-limit hint. */
  advisor?: DonorAdvisor | null;
  /** Fields seeded from the selected handle's persona (U8) — each gets a badge. */
  prefilledFields?: Set<PersonaPrefillField>;
  /**
   * Routes a handle change through the parent so it can gate on a dirty form
   * (discard-confirm). Falls back to a plain field set when absent.
   */
  onRequestHandleChange?: (handleId: string) => void;
  /** Opens the parent-owned quick-create dialog. */
  onRequestCreate?: () => void;
  /** Opens the selected persona editor in the parent-owned dialog. */
  onRequestEdit?: (handleId: string) => void;
  /**
   * Whether the selected handle already has a saved persona — passed through
   * to `DonorHandlePicker`'s "Add profile" / "Change profile" action label.
   */
  personaExists?: boolean | null;
}

/**
 * Presentation layer for the criteria form (U13a, restyled per redesign spec
 * 2.3 "New report"). Three sf-card sections — Persona, Criteria, Ranking
 * preferences (weights + result count behind a collapsed-by-default
 * "Advanced" disclosure) — plus a sticky footer with the rate-limit hint and
 * the Create button. The form parent (`CriteriaInputPanel`) owns the
 * submission flow.
 */
export function CriteriaForm({
  form,
  onSubmit,
  handles,
  handlesLoading,
  submitting,
  submitError,
  advisor,
  prefilledFields,
  onRequestHandleChange,
  onRequestCreate,
  onRequestEdit,
  personaExists,
}: CriteriaFormProps) {
  const { register, handleSubmit, watch, setValue, formState, control } = form;
  const errors = formState.errors;
  const weights = watch("weights");
  const topCount = watch("topCount");
  const hasPersonaCriteria = Boolean(watch("personaCriteriaText"));
  const weightsBalanced = isValidWeights(weights);

  // Opens automatically once the ranking preferences diverge from the
  // shipped defaults — e.g. a persona prefill seeded non-default weights —
  // and never auto-closes again (a manual toggle is always respected after).
  const [advancedOpen, setAdvancedOpen] = useState(false);
  useEffect(() => {
    const customized =
      !weightsEqual(weights, DEFAULT_WEIGHTS_BASIS_POINTS) || topCount !== DEFAULT_TOP_COUNT;
    if (customized) setAdvancedOpen(true);
  }, [weights, topCount]);

  const badge = (name: PersonaPrefillField) =>
    prefilledFields?.has(name) ? <PrefilledFromPersonaBadge control={control} name={name} /> : null;

  const onHandleChange =
    onRequestHandleChange ??
    ((handleId: string) => setValue("donorHandleId", handleId, { shouldValidate: true }));

  // Validation errors render inline next to each field, but the submit button
  // sits in a sticky footer that can be far from the first invalid field — so a
  // blocked submit can read as a silent no-op. Raise a toast naming the first
  // problem so the advisor always gets feedback next to where they clicked.
  const onInvalid = (formErrors: FieldErrors<CriteriaFormValues>) => {
    const firstMessage =
      formErrors.donorHandleId?.message ||
      formErrors.criteriaText?.message ||
      (formErrors.weights?.message as string | undefined) ||
      (formErrors.topCount?.message as string | undefined) ||
      "Check the highlighted fields and try again.";
    toast.error(firstMessage);
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <FormSection description="Who is this research for?" title="Persona">
        <DonorHandlePicker
          error={errors.donorHandleId?.message}
          handles={handles}
          loading={handlesLoading}
          onChange={onHandleChange}
          onRequestCreate={onRequestCreate ?? (() => {})}
          onRequestEdit={onRequestEdit ?? (() => {})}
          personaExists={personaExists}
          value={watch("donorHandleId")}
        />
      </FormSection>

      <FormSection description="Describe what you're researching." title="Criteria">
        {hasPersonaCriteria ? (
          <p className="text-[13px] text-sf-muted">
            This persona&apos;s saved criteria will be included automatically.
          </p>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="sr-only">Research criteria</span>
            <textarea
              {...register("criteriaText")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="e.g. climate orgs in the Pacific Northwest, $5K-$25K range, with recent impact reporting"
              rows={3}
            />
            {errors.criteriaText ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {errors.criteriaText.message}
              </span>
            ) : null}
          </label>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-sf-heading">
              Cause (optional) {badge("cause")}
            </span>
            <input
              {...register("cause")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="climate, education, mental health…"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-sf-heading">
              Geography (optional) {badge("geography")}
            </span>
            <input
              {...register("geography")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="California, Pacific Northwest, NYC metro…"
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <label
              className="flex items-center gap-2 font-medium text-sf-heading"
              htmlFor="criteria-amount-min"
            >
              Amount min ($, optional) {badge("amountMin")}
            </label>
            <AmountInput
              control={control}
              id="criteria-amount-min"
              name="amountMin"
              placeholder="5000"
            />
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <label
              className="flex items-center gap-2 font-medium text-sf-heading"
              htmlFor="criteria-amount-max"
            >
              Amount max ($, optional) {badge("amountMax")}
            </label>
            <AmountInput
              control={control}
              id="criteria-amount-max"
              name="amountMax"
              placeholder="25000"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        description="Defaults work well for most searches. Adjust anytime after the report renders too."
        title="Ranking preferences"
      >
        <AdvancedDisclosure onToggle={() => setAdvancedOpen((o) => !o)} open={advancedOpen}>
          <fieldset className="flex flex-col gap-3">
            <legend className="flex items-center gap-2 px-0 text-sm font-medium text-sf-heading">
              Scoring weights {badge("weights")}
            </legend>
            <p className="text-xs text-sf-muted">
              Set how much each criterion counts toward the composite.
            </p>
            <WeightsAllocator
              disabled={submitting}
              onChange={(next) => setValue("weights", next, { shouldValidate: true })}
              resetValue={DEFAULT_WEIGHTS_BASIS_POINTS}
              value={weights}
            />
            {errors.weights ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {errors.weights.message as string}
              </span>
            ) : null}
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-sf-heading">Featured results</span>
            <span className="text-xs text-sf-muted">
              How many top candidates get a full AI one-pager (1–25). You can change this after the
              report renders.
            </span>
            <input
              {...register("topCount", {
                setValueAs: (v) =>
                  v === "" || v === null || v === undefined ? undefined : Number(v),
              })}
              className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
              max={25}
              min={1}
              type="number"
            />
            {errors.topCount ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {errors.topCount.message as string}
              </span>
            ) : null}
          </label>
        </AdvancedDisclosure>
      </FormSection>

      {submitError ? (
        <div className="rounded-sf-tile border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 dark:border-red-500/[.34] dark:bg-red-500/[.12] dark:text-red-300">
          {submitError}
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-sf-card border border-sf-line bg-sf-card px-5 py-4 shadow-sf-card">
        <div className="flex flex-wrap items-center gap-3">
          {advisor ? <RateLimitCounter advisor={advisor} /> : null}
          <span className="text-[12.5px] text-sf-muted">
            Ranked recommendations with compliance verification in about ten minutes.
          </span>
        </div>
        <button
          className={cn(BTN_BASE, BTN_MD, BTN_PRIMARY, "disabled:opacity-50")}
          disabled={submitting || !weightsBalanced}
          title={weightsBalanced ? undefined : "Scoring weights must add up to 100%"}
          type="submit"
        >
          {submitting ? "Creating…" : "Create report"}
        </button>
      </div>
    </form>
  );
}
