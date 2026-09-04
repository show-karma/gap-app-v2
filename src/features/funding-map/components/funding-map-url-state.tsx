"use client";

import { useEffect, useRef } from "react";
import { useFundingFiltersPublisher } from "../context/funding-filters-context";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useFundingProgramByCompositeId } from "../hooks/use-funding-programs";
import { FundingProgramDetailsDialog } from "./funding-program-details-dialog";

/**
 * Everything on `/funding-map` that touches the URL, in one leaf.
 *
 * It sits behind a `<Suspense>` boundary and renders only the program dialog —
 * which is not crawlable content, so the boundary covers nothing a crawler or a
 * no-JS reader needs. The program list renders outside it, from the context
 * this component publishes into.
 *
 * That split is what the build asked for: nuqs reads `useSearchParams()`, which
 * aborts a prerender unconditionally, and the list was calling it directly
 * (`funding-map-list.tsx:48` → `use-funding-filters.ts:77`).
 */
export function FundingMapUrlState() {
  const { apiParams, filters, programId, setProgramId } = useFundingFilters();
  const { publish, publishOpenProgram } = useFundingFiltersPublisher();
  const cardClickedRef = useRef(false);

  useEffect(() => {
    publish({ apiParams, filters });
  }, [apiParams, filters, publish]);

  useEffect(() => {
    publishOpenProgram((id: string) => {
      cardClickedRef.current = true;
      setProgramId(id);
    });
  }, [publishOpenProgram, setProgramId]);

  const {
    data: programFromUrl,
    isLoading: isProgramLoading,
    isFetched: isProgramFetched,
  } = useFundingProgramByCompositeId(programId || null);

  // Query completed and returned nothing: the id in the URL is not a program.
  const isProgramNotFound =
    Boolean(programId) && isProgramFetched && !isProgramLoading && !programFromUrl;

  return (
    <FundingProgramDetailsDialog
      program={programFromUrl ?? null}
      open={Boolean(programId)}
      onOpenChange={(open) => {
        if (!open) setProgramId("");
      }}
      isLoading={isProgramLoading}
      isNotFound={isProgramNotFound}
      cardClickedRef={cardClickedRef}
    />
  );
}
