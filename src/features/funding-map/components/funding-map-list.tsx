"use client";

import { AlertCircle, Search } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";
import { useMixpanel } from "@/hooks/useMixpanel";
import { PAGES } from "@/utilities/pages";
import { FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import { useFundingFiltersValue } from "../context/funding-filters-context";
import type { FundingFilters } from "../hooks/use-funding-filters";
import { useFundingPrograms } from "../hooks/use-funding-programs";
import type { FundingProgramResponse } from "../types/funding-program";
import { FundingMapCard } from "./funding-map-card";
import { FundingMapCardSkeleton } from "./funding-map-card-skeleton";
import { FundingMapFilters } from "./funding-map-filters";
import { FundingMapPagination } from "./funding-map-pagination";
import { FundingMapUrlState } from "./funding-map-url-state";

/**
 * Crawlable detail-page URL for a program, when one exists. Programs
 * configured on Karma with a community get a real
 * /community/[slug]/programs/[programId] page; giving the card that href
 * puts a followable anchor in the server-rendered HTML (the dialog
 * behavior on click remains for JS users). Returns undefined for
 * registry-only programs, which keep the plain dialog card.
 */
export function getProgramDetailHref(program: FundingProgramResponse): string | undefined {
  const communitySlug = program.communities?.[0]?.slug;
  if (!program.isOnKarma || !program.programId || !communitySlug) {
    return undefined;
  }
  return PAGES.COMMUNITY.PROGRAM_DETAIL(communitySlug, program.programId);
}

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
  // No URL read here: nuqs calls useSearchParams(), which aborts the prerender
  // of this sitemap-crawlable route unconditionally. The params start at the
  // server default the page prefetched and are replaced by FundingMapUrlState
  // after hydration.
  const { apiParams, filters, openProgram } = useFundingFiltersValue();
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
          search: filters?.search,
          status: filters?.status,
          categories: filters?.categories,
          grantTypes: filters?.grantTypes,
          onlyOnKarma: filters?.onlyOnKarma,
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const programs = data?.programs ?? [];
  const totalCount = data?.count ?? 0;

  // Use program from URL query, or find from list as fallback

  const handleProgramClick = (program: FundingProgramResponse) => {
    // Use programId (preferred), or MongoDB _id as fallback for programs without
    // programId. The URL write itself lives in the leaf, which is the only place
    // allowed to touch it.
    openProgram(program.programId || getProgramId(program));
  };

  // Track empty results
  useEffect(() => {
    if (!isLoading && !isError && programs.length === 0) {
      mixpanel.reportEvent({
        event: "funding-map:empty-results",
        properties: {
          activeFilters: {
            searchLength: filters?.search.length,
            status: filters?.status,
            categories: filters?.categories,
            grantTypes: filters?.grantTypes,
            onlyOnKarma: filters?.onlyOnKarma,
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
            searchLength: filters?.search.length,
            status: filters?.status,
            categories: filters?.categories,
            grantTypes: filters?.grantTypes,
            onlyOnKarma: filters?.onlyOnKarma,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error, filters]);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {/* Controls, not content: they read the URL, so they sit behind leaf
          boundaries. Neither renders a link, so no crawlable graph is hidden. */}
      <Suspense fallback={null}>
        <FundingMapFilters totalCount={totalCount} />
      </Suspense>

      {isLoading && <FundingMapListSkeleton />}

      {isError && <FundingMapError error={error} />}

      {!isLoading && !isError && programs.length === 0 && (
        <FundingMapEmpty hasFilters={filters ? hasActiveFilters(filters) : false} />
      )}

      {!isLoading && !isError && programs.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program, index) => (
              <FundingMapCard
                key={getProgramId(program)}
                program={program}
                onClick={() => handleProgramClick(program)}
                href={getProgramDetailHref(program)}
                cardPosition={index}
                page={filters?.page ?? 1}
              />
            ))}
          </div>
          <Suspense fallback={null}>
            <FundingMapPagination totalCount={totalCount} />
          </Suspense>
        </div>
      )}

      {/* Link-free leaf: it owns every URL read on this route and renders only
          the dialog, which no crawler needs. The grid above stays prerendered. */}
      <Suspense fallback={null}>
        <FundingMapUrlState />
      </Suspense>
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

function hasActiveFilters(filters: FundingFilters): boolean {
  return (
    filters.search !== "" ||
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.ecosystems.length > 0 ||
    filters.networks.length > 0 ||
    filters.grantTypes.length > 0 ||
    filters.onlyOnKarma ||
    filters.organizationFilter !== null ||
    (filters.selectedTypes?.length ?? 0) > 0
  );
}
