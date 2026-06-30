import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDonorPersona,
  refineDonorPersona,
  type UpdateDonorPersonaInput,
  updateDonorPersona,
} from "@/services/donor-research.service";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "@/src/features/donor-research/components/report-brief/scoring";
import type { DonorPersona, PersonaProvenance, PersonaStructured } from "@/types/donor-research";

export const donorPersonaQueryKey = (handleId: string) => ["donor-persona", handleId] as const;

/**
 * Fetches the persona for a donor handle. A handle with no persona yet
 * resolves to `null` (the service maps the 404 → `null`), which the editor
 * renders as the normal empty state — not an error.
 */
export function useDonorPersona(handleId: string | null | undefined) {
  return useQuery<DonorPersona | null>({
    queryKey: donorPersonaQueryKey(handleId ?? ""),
    queryFn: () => getDonorPersona(handleId as string),
    enabled: !!handleId,
  });
}

const EMPTY_STRUCTURED: PersonaStructured = {
  orgMaturity: { value: null, source: null },
  geoRadius: { value: null, source: null },
  faithStance: { value: null, source: null },
  giftSizeBand: { value: null, source: null },
  advocacyStance: { value: null, source: null },
};

/**
 * Best-effort optimistic projection of a PUT onto the cached persona.
 *
 * `computedWeights`, `id`, and timestamps are placeholders here — they are
 * server-owned and get replaced by the mutation response. We only need the
 * editor-visible fields (source text, narrative, chips) to update instantly.
 */
function projectPersona(
  previous: DonorPersona | null,
  input: UpdateDonorPersonaInput,
  handleId: string
): DonorPersona {
  const base: DonorPersona = previous ?? {
    id: `optimistic-${handleId}`,
    donorHandleId: handleId,
    sourceText: null,
    narrative: null,
    structured: EMPTY_STRUCTURED,
    computedWeights: DEFAULT_WEIGHTS_BASIS_POINTS,
    refinedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Widen the field value type for dynamic per-key assignment, then narrow
  // back to PersonaStructured at the boundary. (Per-key generics can't be
  // preserved through a string-keyed loop without a verbose switch.)
  const structured = { ...base.structured } as Record<
    keyof PersonaStructured,
    { value: string | null; source: PersonaProvenance | null }
  >;
  if (input.structured) {
    for (const [key, chip] of Object.entries(input.structured)) {
      if (!chip) continue;
      // Coherence: a cleared chip carries no provenance.
      structured[key as keyof PersonaStructured] =
        chip.value === null
          ? { value: null, source: null }
          : { value: chip.value, source: chip.source ?? "manual" };
    }
  }

  return {
    ...base,
    sourceText: input.sourceText !== undefined ? input.sourceText : base.sourceText,
    narrative: input.narrative !== undefined ? input.narrative : base.narrative,
    amountMin: input.amountMin !== undefined ? input.amountMin : base.amountMin,
    amountMax: input.amountMax !== undefined ? input.amountMax : base.amountMax,
    cause: input.cause !== undefined ? input.cause : base.cause,
    geography: input.geography !== undefined ? input.geography : base.geography,
    structured: structured as PersonaStructured,
    updatedAt: new Date().toISOString(),
  };
}

interface UpdatePersonaContext {
  previous: DonorPersona | null;
}

/**
 * Upserts the persona with an optimistic cache write + rollback. Handles both
 * the first-save case (cache is `null`) and the update case (cache is a
 * persona). On error the snapshot is restored as `null` (never `undefined`).
 * On settle, both the persona query and the donor-handles list are
 * invalidated so any handle-level "has persona" signal refreshes.
 */
export function useUpdateDonorPersona(handleId: string) {
  const queryClient = useQueryClient();
  const key = donorPersonaQueryKey(handleId);

  return useMutation<DonorPersona, Error, UpdateDonorPersonaInput, UpdatePersonaContext>({
    mutationFn: (input) => updateDonorPersona(handleId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const cached = queryClient.getQueryData<DonorPersona | null>(key);
      const previous = cached ?? null;
      queryClient.setQueryData<DonorPersona | null>(key, projectPersona(previous, input, handleId));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData<DonorPersona | null>(key, context.previous);
      }
    },
    onSuccess: (saved) => {
      // The server response carries the recomputed computedWeights + real
      // ids/timestamps — replace the optimistic projection with it.
      queryClient.setQueryData<DonorPersona | null>(key, saved);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["donor-research", "handles"] });
    },
  });
}

/**
 * Runs an LLM refinement. No optimistic cache write — the refine result is a
 * non-persisted preview the editor hydrates into local review state via the
 * returned data.
 */
export function useRefineDonorPersona(handleId: string) {
  return useMutation({
    mutationFn: (sourceText: string) => refineDonorPersona(handleId, sourceText),
  });
}
