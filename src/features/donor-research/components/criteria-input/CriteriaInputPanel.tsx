"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { PAGES } from "@/utilities/pages";
import { CriteriaForm } from "./CriteriaForm";

const CriteriaSchema = z.object({
  donorHandleId: z.string().min(1, "Pick or create a donor handle"),
  criteriaText: z.string().min(1, "Describe what you're researching").max(5000),
  cause: z.string().max(500).optional(),
  geography: z.string().max(500).optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional(),
});

export type CriteriaFormValues = z.infer<typeof CriteriaSchema>;

/**
 * Top-level container for the criteria input flow (U13a).
 *
 * Owns the form state and dispatches the Fast report-create POST. (Deep
 * mode is postponed with Phase C, so the form only runs Fast reports.)
 */
export function CriteriaInputPanel() {
  const { push } = useRouter();
  const handlesQuery = useDonorHandles({ limit: 200 });
  const createReport = useCreateDonorReport();

  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(CriteriaSchema),
    defaultValues: {
      donorHandleId: "",
      criteriaText: "",
      cause: "",
      geography: "",
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
    });
    push(PAGES.DONOR_RESEARCH.REPORT(result.reportId));
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
