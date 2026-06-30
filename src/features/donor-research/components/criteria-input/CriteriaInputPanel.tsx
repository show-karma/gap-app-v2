"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { PAGES } from "@/utilities/pages";
import { buildPersonaPrefill, type PersonaPrefill } from "../../utils/persona-prefill";
import { DEFAULT_TOP_COUNT, DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WEIGHTS_TOTAL_BASIS_POINTS } from "../weights/weights-allocation";
import { CriteriaForm } from "./CriteriaForm";
import { NewDonorHandleModal } from "./NewDonorHandleModal";
import type { PersonaPrefillField } from "./PrefilledFromPersonaBadge";

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

/** Builds the form defaults for a handle, seeding from its persona prefill. */
function buildCriteriaDefaults(
  handleId: string,
  prefill: PersonaPrefill | null
): CriteriaFormValues {
  return {
    donorHandleId: handleId,
    criteriaText: prefill?.criteriaTextAppendix ? prefill.criteriaTextAppendix.trimStart() : "",
    cause: prefill?.cause ?? "",
    geography: prefill?.geography ?? "",
    // Amounts come from the persona's explicit extracted figures (when present).
    amountMin: prefill?.amountMin,
    amountMax: prefill?.amountMax,
    weights: prefill?.weights ?? DEFAULT_WEIGHTS_BASIS_POINTS,
    topCount: DEFAULT_TOP_COUNT,
  };
}

/** Which fields the prefill actually seeded — drives the per-field badges. */
function prefilledFieldsOf(prefill: PersonaPrefill | null): Set<PersonaPrefillField> {
  const fields = new Set<PersonaPrefillField>();
  if (!prefill) return fields;
  if (prefill.criteriaTextAppendix) fields.add("criteriaText");
  if (prefill.cause) fields.add("cause");
  if (prefill.geography) fields.add("geography");
  if (prefill.amountMin !== undefined) fields.add("amountMin");
  if (prefill.amountMax !== undefined) fields.add("amountMax");
  // computedWeights is always present on a persona, so weights are always seeded.
  fields.add("weights");
  return fields;
}

/**
 * Top-level container for the criteria input flow (U13a + U8 persona prefill).
 *
 * Owns the form state and dispatches the Fast report-create POST. Selecting a
 * handle prefills the form from its persona as a *default*; changing handle
 * while the form is dirty prompts a discard confirmation. Persona fetch
 * failures fall back silently to shipped defaults — prefill is best-effort and
 * never blocks report creation. The form never writes back to the persona.
 */
export function CriteriaInputPanel() {
  const router = useRouter();
  const handlesQuery = useDonorHandles({ limit: 200 });
  const createReport = useCreateDonorReport();

  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(CriteriaSchema),
    defaultValues: buildCriteriaDefaults("", null),
  });

  const selectedHandleId = form.watch("donorHandleId");
  const personaQuery = useDonorPersona(selectedHandleId || null);
  const [prefilledFields, setPrefilledFields] = useState<Set<PersonaPrefillField>>(new Set());
  const [pendingHandleId, setPendingHandleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editHandleId, setEditHandleId] = useState<string | null>(null);

  // Apply the selected handle's persona prefill once it resolves — but only
  // while the form is clean, so in-progress edits are never clobbered. A 404
  // (data null) or 5xx (data undefined) both yield a null prefill → shipped
  // defaults, no badges.
  const personaData = personaQuery.data;
  const personaLoading = personaQuery.isLoading;
  useEffect(() => {
    if (!selectedHandleId) return;
    if (personaLoading) return;
    if (form.formState.isDirty) return;
    const prefill = buildPersonaPrefill(personaData ?? null);
    form.reset(buildCriteriaDefaults(selectedHandleId, prefill), {
      keepDirty: false,
      keepDefaultValues: false,
    });
    setPrefilledFields(prefilledFieldsOf(prefill));
  }, [selectedHandleId, personaData, personaLoading, form]);

  const requestHandleChange = (handleId: string) => {
    if (handleId === selectedHandleId) return;
    if (form.formState.isDirty) {
      // Native <select> stays controlled by form state, so it visually reverts
      // until the advisor confirms the discard.
      setPendingHandleId(handleId);
      return;
    }
    form.setValue("donorHandleId", handleId, { shouldDirty: false, shouldValidate: true });
  };

  // A freshly-created handle is always selected (it has no persona to clobber),
  // so the advisor lands on it when the Sheet closes. Selecting it also lets the
  // prefill effect seed the form from the persona once they save one.
  const onHandleCreated = (handleId: string) => {
    form.setValue("donorHandleId", handleId, { shouldDirty: false, shouldValidate: true });
  };

  // The gear edits the selected handle's persona in the same modal, pre-filled.
  const editHandle = handlesQuery.data?.items.find((handle) => handle.id === editHandleId) ?? null;
  const personaModalOpen = createOpen || editHandleId !== null;

  const confirmDiscard = () => {
    if (pendingHandleId === null) return;
    // Discard edits and switch; the effect re-applies prefill once the new
    // handle's persona resolves.
    form.reset(buildCriteriaDefaults(pendingHandleId, null), {
      keepDirty: false,
      keepDefaultValues: false,
    });
    setPrefilledFields(new Set());
    setPendingHandleId(null);
  };

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
        prefilledFields={prefilledFields}
        onRequestHandleChange={requestHandleChange}
        onRequestCreate={() => setCreateOpen(true)}
        onRequestEdit={(handleId) => setEditHandleId(handleId)}
      />

      {createReport.isError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {(createReport.error as Error)?.message || "Couldn't start the report. Try again."}
        </p>
      ) : null}

      <Dialog
        open={pendingHandleId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHandleId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>
              Switching donor handles replaces this form with the new handle's persona defaults.
              Your current edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setPendingHandleId(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDiscard}
              className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Discard and switch
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewDonorHandleModal
        open={personaModalOpen}
        editHandle={editHandle}
        onOpenChange={(next) => {
          if (next) return;
          setCreateOpen(false);
          setEditHandleId(null);
        }}
        onCreated={onHandleCreated}
      />
    </div>
  );
}
