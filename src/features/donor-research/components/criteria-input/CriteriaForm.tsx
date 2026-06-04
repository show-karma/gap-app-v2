"use client";

import type { UseFormReturn } from "react-hook-form";
import type { DonorHandle } from "@/types/donor-research";
import type { CriteriaFormValues } from "./CriteriaInputPanel";
import { DonorHandlePicker } from "./DonorHandlePicker";

interface CriteriaFormProps {
  form: UseFormReturn<CriteriaFormValues>;
  onSubmit: (values: CriteriaFormValues) => Promise<void> | void;
  handles: DonorHandle[];
  handlesLoading: boolean;
  submitting: boolean;
}

/**
 * Presentation layer for the criteria form (U13a).
 *
 * Free-text criteria + optional structured fields + mode toggle. The
 * form parent (`CriteriaInputPanel`) owns the submission flow including
 * the Deep-mode confirmation modal.
 */
export function CriteriaForm({
  form,
  onSubmit,
  handles,
  handlesLoading,
  submitting,
}: CriteriaFormProps) {
  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;
  const mode = watch("mode");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <DonorHandlePicker
        handles={handles}
        loading={handlesLoading}
        value={watch("donorHandleId")}
        onChange={(handleId) => setValue("donorHandleId", handleId, { shouldValidate: true })}
        error={errors.donorHandleId?.message}
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Criteria</span>
        <textarea
          {...register("criteriaText")}
          rows={4}
          placeholder="e.g. climate orgs in the Pacific Northwest, $5K-$25K range, with recent impact reporting"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {errors.criteriaText ? (
          <span className="text-xs text-red-600">{errors.criteriaText.message}</span>
        ) : null}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Cause (optional)</span>
          <input
            {...register("cause")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="climate, education, mental health…"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Geography (optional)</span>
          <input
            {...register("geography")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="California, Pacific Northwest, NYC metro…"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Amount min ($, optional)</span>
          <input
            {...register("amountMin", {
              valueAsNumber: true,
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
            type="number"
            min={0}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="5000"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Amount max ($, optional)</span>
          <input
            {...register("amountMax", {
              valueAsNumber: true,
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
            type="number"
            min={0}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="25000"
          />
        </label>
      </div>

      <fieldset className="rounded-md border border-border p-3">
        <legend className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mode
        </legend>
        <div className="flex flex-col gap-2 md:flex-row md:gap-6">
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" value="fast" {...register("mode")} className="mt-1" />
            <span>
              <strong className="block">Fast (~10 min)</strong>
              <span className="text-muted-foreground">
                Ranked recommendations + compliance + public-data freshness. Returns same session.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" value="deep" {...register("mode")} className="mt-1" />
            <span>
              <strong className="block">Deep (1–3 days)</strong>
              <span className="text-muted-foreground">
                Extended diligence: auto-call + email outreach. Results stream in over 1–3 days.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Starting…" : mode === "deep" ? "Continue to Deep mode" : "Start Fast report"}
      </button>
    </form>
  );
}
