"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { PAGES } from "@/utilities/pages";
import { CriteriaForm } from "./CriteriaForm";
import { DeepConfirmModal } from "./DeepConfirmModal";

const CriteriaSchema = z.object({
  donorHandleId: z.string().min(1, "Pick or create a donor handle"),
  criteriaText: z.string().min(1, "Describe what you're researching").max(5000),
  cause: z.string().max(500).optional(),
  geography: z.string().max(500).optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional(),
  mode: z.enum(["fast", "deep"]),
});

export type CriteriaFormValues = z.infer<typeof CriteriaSchema>;

/**
 * Top-level container for the criteria input flow (U13a).
 *
 * Owns the form state + the Deep-mode confirmation modal. Deep mode
 * authorization gate per plan: a separate explicit checkbox confirmation
 * must clear before the report-create POST fires.
 */
export function CriteriaInputPanel() {
  const router = useRouter();
  const handlesQuery = useDonorHandles({ limit: 200 });
  const createReport = useCreateDonorReport();
  const [deepConfirmOpen, setDeepConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CriteriaFormValues | null>(null);

  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(CriteriaSchema),
    defaultValues: {
      donorHandleId: "",
      criteriaText: "",
      cause: "",
      geography: "",
      mode: "fast",
    },
  });

  const onSubmit = async (values: CriteriaFormValues) => {
    if (values.mode === "deep") {
      setPendingValues(values);
      setDeepConfirmOpen(true);
      return;
    }
    await dispatch(values);
  };

  const dispatch = async (values: CriteriaFormValues) => {
    const result = await createReport.mutateAsync({
      donorHandleId: values.donorHandleId,
      criteriaText: values.criteriaText,
      cause: values.cause || null,
      geography: values.geography || null,
      amountMin: values.amountMin ?? null,
      amountMax: values.amountMax ?? null,
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
        <p className="mt-3 text-sm text-red-600">
          {(createReport.error as Error)?.message || "Couldn't start the report. Try again."}
        </p>
      ) : null}

      <DeepConfirmModal
        open={deepConfirmOpen}
        onClose={() => setDeepConfirmOpen(false)}
        onConfirm={async () => {
          if (!pendingValues) return;
          setDeepConfirmOpen(false);
          await dispatch(pendingValues);
        }}
      />
    </div>
  );
}
