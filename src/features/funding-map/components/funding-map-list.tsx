"use client";

import { AlertCircle, Search } from "lucide-react";
import { FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useFundingProgramByCompositeId, useFundingPrograms } from "../hooks/use-funding-programs";
import type { FundingProgramResponse } from "../types/funding-program";
import { FundingMapCard } from "./funding-map-card";
import { FundingMapCardSkeleton } from "./funding-map-card-skeleton";
import { FundingMapFilters } from "./funding-map-filters";
import { FundingMapPagination } from "./funding-map-pagination";
import { FundingProgramDetailsDialog } from "./funding-program-details-dialog";

export function FundingMapList() {
  const { apiParams, filters, programId, setProgramId } = useFundingFilters();
  const { data, isLoading, isError, error } = useFundingPrograms(apiParams);

  // Fetch program from URL if programId is set
  const { data: programFromUrl, isLoading: isProgramLoading } = useFundingProgramByCompositeId(
    programId || null
  );

  const programs = data?.programs ?? [];
  const totalCount = data?.count ?? 0;

  // Dialog is open when we have a programId in URL
  const dialogOpen = Boolean(programId);

  // Use program from URL query, or find from list as fallback
  const selectedProgram = programFromUrl ?? null;

  const handleProgramClick = (program: FundingProgramResponse) => {
    // Set programId in URL format: programId_chainId
    const compositeId = `${program.programId}_${program.chainID}`;
    setProgramId(compositeId);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clear programId from URL when closing dialog
      setProgramId("");
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <FundingMapFilters />

      {isLoading && <FundingMapListSkeleton />}

      {isError && <FundingMapError error={error} />}

      {!isLoading && !isError && programs.length === 0 && (
        <FundingMapEmpty hasFilters={hasActiveFilters(filters)} />
      )}

      {!isLoading && !isError && programs.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program) => (
              <FundingMapCard
                key={program._id.$oid}
                program={program}
                onClick={() => handleProgramClick(program)}
              />
            ))}
          </div>
          <FundingMapPagination totalCount={totalCount} />
        </div>
      )}

      <FundingProgramDetailsDialog
        program={selectedProgram}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        isLoading={isProgramLoading}
      />
    </section>
  );
}

function FundingMapListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: FUNDING_MAP_PAGE_SIZE }).map((_, i) => (
        <FundingMapCardSkeleton key={i} />
      ))}
    </div>
  );
}

function FundingMapError({ error }: { error: Error | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">Failed to load programs</h3>
        <p className="text-sm text-muted-foreground">
          {error?.message || "An unexpected error occurred. Please try again later."}
        </p>
      </div>
    </div>
  );
}

function FundingMapEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/30 p-8 text-center">
      <Search className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">No programs found</h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters to find more programs."
            : "There are no funding programs available at the moment."}
        </p>
      </div>
    </div>
  );
}

function hasActiveFilters(filters: ReturnType<typeof useFundingFilters>["filters"]): boolean {
  return (
    filters.search !== "" ||
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.ecosystems.length > 0 ||
    filters.networks.length > 0 ||
    filters.grantTypes.length > 0 ||
    filters.onlyOnKarma ||
    filters.organizationFilter !== null
  );
}
