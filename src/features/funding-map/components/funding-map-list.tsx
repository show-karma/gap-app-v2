"use client";

import { AlertCircle, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useMixpanel } from "@/hooks/useMixpanel";
import { FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useFundingProgramByCompositeId, useFundingPrograms } from "../hooks/use-funding-programs";
import type { FundingProgramResponse } from "../types/funding-program";
import { FundingMapCard } from "./funding-map-card";
import { FundingMapCardSkeleton } from "./funding-map-card-skeleton";
import { FundingMapFilters } from "./funding-map-filters";
import { FundingMapPagination } from "./funding-map-pagination";
import { FundingProgramDetailsDialog } from "./funding-program-details-dialog";

/**
 * Extract MongoDB _id as string - handles both V2 API (string) and legacy ({ $oid: string }) formats
 */
function getProgramId(program: FundingProgramResponse): string {
  if (typeof program._id === "string") {
    return program._id;
  }
  if (program._id && typeof program._id === "object" && "$oid" in program._id) {
    return program._id.$oid;
  }
  // Fallback to programId or generate a unique key
  return program.programId || program.id || `program-${program.createdAt}`;
}

export function FundingMapList() {
  const { apiParams, filters, programId, setProgramId } = useFundingFilters();
  const { data, isLoading, isError, error } = useFundingPrograms(apiParams);
  const { mixpanel } = useMixpanel("karma");
  const hasTrackedPageView = useRef(false);

  // Page-view tracking (fires once on mount)
  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;
    const urlParams = new URLSearchParams(window.location.search);
    mixpanel.reportEvent({
      event: "funding-map:page-view",
      properties: {
        referrer: document.referrer,
        hasFiltersInUrl: urlParams.toString().length > 0,
        initialFilters: {
          search: filters.search,
          status: filters.status,
          categories: filters.categories,
          grantTypes: filters.grantTypes,
          onlyOnKarma: filters.onlyOnKarma,
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch program from URL if programId is set
  const {
    data: programFromUrl,
    isLoading: isProgramLoading,
    isFetched: isProgramFetched,
  } = useFundingProgramByCompositeId(programId || null);

  // Program not found: query completed but returned null
  const isProgramNotFound =
    Boolean(programId) && isProgramFetched && !isProgramLoading && !programFromUrl;

  const programs = data?.programs ?? [];
  const totalCount = data?.count ?? 0;

  // Dialog is open when we have a programId in URL
  const dialogOpen = Boolean(programId);

  // Use program from URL query, or find from list as fallback
  const selectedProgram = programFromUrl ?? null;

  // Track card clicks via ref flag for details-open source detection
  const cardClickedRef = useRef(false);

  const handleProgramClick = (program: FundingProgramResponse) => {
    cardClickedRef.current = true;
    // Use programId (preferred), or MongoDB _id as fallback for programs without programId
    // MongoDB _id is unique across the collection
    const id = program.programId || getProgramId(program);
    setProgramId(id);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clear programId from URL when closing dialog
      setProgramId("");
    }
  };

  // Track empty results
  useEffect(() => {
    if (!isLoading && !isError && programs.length === 0) {
      mixpanel.reportEvent({
        event: "funding-map:empty-results",
        properties: {
          activeFilters: {
            searchLength: filters.search.length,
            status: filters.status,
            categories: filters.categories,
            grantTypes: filters.grantTypes,
            onlyOnKarma: filters.onlyOnKarma,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, programs.length, filters]);

  // Track load errors
  useEffect(() => {
    if (isError && error) {
      mixpanel.reportEvent({
        event: "funding-map:load-error",
        properties: {
          errorType: error.name,
          activeFilters: {
            searchLength: filters.search.length,
            status: filters.status,
            categories: filters.categories,
            grantTypes: filters.grantTypes,
            onlyOnKarma: filters.onlyOnKarma,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error, filters]);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <FundingMapFilters totalCount={totalCount} />

      {isLoading && <FundingMapListSkeleton />}

      {isError && <FundingMapError error={error} />}

      {!isLoading && !isError && programs.length === 0 && (
        <FundingMapEmpty hasFilters={hasActiveFilters(filters)} />
      )}

      {!isLoading && !isError && programs.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program, index) => (
              <FundingMapCard
                key={getProgramId(program)}
                program={program}
                onClick={() => handleProgramClick(program)}
                cardPosition={index}
                page={filters.page}
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
        isNotFound={isProgramNotFound}
        cardClickedRef={cardClickedRef}
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
    !filters.onlyOnKarma ||
    filters.organizationFilter !== null
  );
}
