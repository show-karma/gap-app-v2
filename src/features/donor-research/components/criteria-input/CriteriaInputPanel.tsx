"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { PAGES } from "@/utilities/pages";
import { DEFAULT_TOP_COUNT, DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WEIGHTS_TOTAL_BASIS_POINTS } from "../weights/weights-allocation";
import { CriteriaForm } from "./CriteriaForm";

// The advisor allocates each weight independently (basis points); the five must
// add up to exactly 100% (10000 bp) before the report can run.
const WeightsSchema = z
  .object({
    onlinePresence: z.number().int().min(0).max(WEIGHTS_TOTAL_BASIS_POINTS),
    socialPresence: z.number().int().min(0).max(WEIGHTS_TOTAL_BASIS_POINTS),
    impactRecency: z.number().int().min(0).max(WEIGHTS_TOTAL_BASIS_POINTS),
    donorMatch: z.number().int().min(0).max(WEIGHTS_TOTAL_BASIS_POINTS),
    compliance: z.number().int().min(0).max(WEIGHTS_TOTAL_BASIS_POINTS),
  })
  .refine(
    (w) =>
      w.onlinePresence + w.socialPresence + w.impactRecency + w.donorMatch + w.compliance ===
      WEIGHTS_TOTAL_BASIS_POINTS,
    { message: "Weights must add up to 100%." }
  );

const CriteriaSchema = z.object({
  donorHandleId: z.string().min(1, "Pick or create a donor handle"),
  criteriaText: z.string().min(1, "Describe what you're researching").max(5000),
  cause: z.string().max(500).optional(),
  geography: z.string().max(500).optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional(),
  weights: WeightsSchema,
  topCount: z.number().int().min(1).max(25),
});

export type CriteriaFormValues = z.infer<typeof CriteriaSchema>;

/**
 * Top-level container for the criteria input flow (U13a).
 *
 * Owns the form state and dispatches the Fast report-create POST. (Deep
 * mode is postponed with Phase C, so the form only runs Fast reports.)
 */
export function CriteriaInputPanel() {
  const router = useRouter();
  const handlesQuery = useDonorHandles({ limit: 200 });
  const createReport = useCreateDonorReport();

  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(CriteriaSchema),
    defaultValues: {
      donorHandleId: "",
      criteriaText: "",
      cause: "",
      geography: "",
      weights: DEFAULT_WEIGHTS_BASIS_POINTS,
      topCount: DEFAULT_TOP_COUNT,
    },
  });

  const onSubmit = async (values: CriteriaFormValues) => {
    const result = await createReport.mutateAsync({
      donorHandleId: values.donorHandleId,
      criteriaText: values.criteriaText,
      cause: values.cause || null,
      geography: values.geography || null,
      amountMin: values.amountMin ?? null,
      amountMax: values.amountMax ?? null,
      weights: values.weights,
      topCount: values.topCount,
    });
    router.push(PAGES.DONOR_RESEARCH.REPORT(result.reportId));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">New research report</h2>
        <p className="text-sm text-muted-foreground">
          Describe what you're researching. We'll return ranked nonprofit recommendations with EIN +
          mailing address on every row.
        </p>
      </header>

      <CriteriaForm
        form={form}
        onSubmit={onSubmit}
        handles={handlesQuery.data?.items ?? []}
        handlesLoading={handlesQuery.isLoading}
        submitting={createReport.isPending}
      />

      {createReport.isError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {(createReport.error as Error)?.message || "Couldn't start the report. Try again."}
        </p>
      ) : null}
    </div>
  );
}
