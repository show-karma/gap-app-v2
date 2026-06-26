"use client";

import type { UseFormReturn } from "react-hook-form";
import type { DonorHandle } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WeightsAllocator } from "../weights/WeightsAllocator";
import { isValidWeights } from "../weights/weights-allocation";
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
 * Free-text criteria + optional structured fields. The form parent
 * (`CriteriaInputPanel`) owns the submission flow.
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
  const weights = watch("weights");
  const weightsBalanced = isValidWeights(weights);

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
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.criteriaText.message}
          </span>
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
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? undefined : Number(v),
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
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? undefined : Number(v),
            })}
            type="number"
            min={0}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="25000"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-muted/10 px-3 py-3">
        <legend className="px-1 text-sm font-medium">Scoring weights</legend>
        <p className="text-xs text-muted-foreground">
          Set how much each criterion counts toward the composite. You can adjust this again after
          the report renders.
        </p>
        <WeightsAllocator
          value={weights}
          onChange={(next) => setValue("weights", next, { shouldValidate: true })}
          resetValue={DEFAULT_WEIGHTS_BASIS_POINTS}
          disabled={submitting}
        />
        {errors.weights ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.weights.message as string}
          </span>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Featured results</span>
        <span className="text-xs text-muted-foreground">
          How many top candidates get a full AI one-pager (1–25). You can change this after the
          report renders.
        </span>
        <input
          {...register("topCount", {
            setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
          })}
          type="number"
          min={1}
          max={25}
          className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {errors.topCount ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.topCount.message as string}
          </span>
        ) : null}
      </label>

      <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
        Returns ranked recommendations with compliance verification and public-data freshness in
        about ten minutes.
      </div>

      <button
        type="submit"
        disabled={submitting || !weightsBalanced}
        title={weightsBalanced ? undefined : "Scoring weights must add up to 100%"}
        className="self-start rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Start report"}
      </button>
    </form>
  );
}
