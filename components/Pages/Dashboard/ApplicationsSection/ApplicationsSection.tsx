"use client";

import { useQueries } from "@tanstack/react-query";
import { BanknoteArrowDown, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProgramWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { ApplicationsFilters } from "@/features/user-applications/components/ApplicationsFilters";
import { ApplicationsList } from "@/features/user-applications/components/ApplicationsList";
import type { UseUserApplicationsReturn } from "@/features/user-applications/types";
import { Link } from "@/src/components/navigation/Link";
import { ApplicationLookupModal } from "@/src/features/application-lookup/components/ApplicationLookupModal";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";

interface CommunityInfo {
  slug: string;
  name: string;
  image?: string;
}

interface ApplicationsSectionProps {
  communitySlug?: string;
  applicationsHook: UseUserApplicationsReturn;
  programs: ProgramWithConfig[];
}

export function ApplicationsSection({
  communitySlug,
  applicationsHook,
  programs,
}: ApplicationsSectionProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  const {
    applications,
    filters,
    pagination,
    statusCounts,
    isLoading,
    error,
    setFilters,
    setPage,
    refresh,
  } = applicationsHook;

  // When no communitySlug, fetch program configs to resolve community info per application
  const uniqueProgramIds = useMemo(() => {
    if (communitySlug) return [];
    return [...new Set(applications.map((a) => a.programId))];
  }, [applications, communitySlug]);

  const programQueries = useQueries({
    queries: uniqueProgramIds.map((programId) => ({
      queryKey: ["funding-program-config", programId],
      queryFn: async () => {
        const [res, err] = await fetchData<FundingProgram>(
          INDEXER.V2.FUNDING_PROGRAMS.GET(programId),
          "GET",
          {},
          {},
          {},
          true
        );
        if (err) return null;
        return res;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  const enrichedApplications = useMemo((): Application[] => {
    if (communitySlug) return applications;

    const knownCommunities = chosenCommunities(true);
    const communityMap = new Map<string, CommunityInfo>();

    for (let i = 0; i < uniqueProgramIds.length; i++) {
      const program = programQueries[i]?.data;
      if (program?.communitySlug && !communityMap.has(uniqueProgramIds[i])) {
        const known = knownCommunities.find((c) => c.slug === program.communitySlug);
        communityMap.set(uniqueProgramIds[i], {
          slug: program.communitySlug,
          name: known?.name || program.communitySlug,
          image: known?.imageURL.light,
        });
      }
    }

    if (communityMap.size === 0) return applications;

    return applications.map((app) => {
      const info = communityMap.get(app.programId);
      if (!info) return app;
      return {
        ...app,
        communitySlug: app.communitySlug || info.slug,
        communityName: app.communityName || info.name,
        communityImage: app.communityImage || info.image,
      };
    });
  }, [applications, communitySlug, uniqueProgramIds, programQueries]);

  const handleResetFilters = () => {
    setFilters({
      status: "all",
      programId: undefined,
      searchQuery: "",
      dateRange: undefined,
    });
  };

  const stats = useMemo(() => {
    const counts = statusCounts ?? {};
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const pending = (counts.pending ?? 0) + (counts.resubmitted ?? 0);
    const approved = counts.approved ?? 0;
    return { total, pending, approved };
  }, [statusCounts]);

  const hasApplications = stats.total > 0;
  const hasActiveFilters = filters.status !== "all" || !!filters.programId || !!filters.searchQuery;
  const showEmptyState = !hasApplications && !hasActiveFilters && !isLoading && !error;

  return (
    <section id="applications" className={showEmptyState ? "space-y-4" : "space-y-6"}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">My Applications</h2>
        <p className="text-sm text-muted-foreground">Track and manage your funding applications.</p>
      </div>

      {showEmptyState ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No applications yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Browse funding programs to find opportunities and submit your first application.
          </p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href={PAGES.REGISTRY.ROOT}>
              <BanknoteArrowDown className="mr-2 h-4 w-4" />
              Explore programs
            </Link>
          </Button>

          {communitySlug ? (
            <button
              type="button"
              onClick={() => setIsLookupOpen(true)}
              className="mt-3 text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Can&apos;t find your application? Look it up
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {hasApplications ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-muted-foreground">
                  Total {stats.total === 1 ? "Application" : "Applications"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending}
                </p>
                <p className="text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.approved}
                </p>
                <p className="text-muted-foreground">Approved</p>
              </div>
            </div>
          ) : null}

          {hasApplications || hasActiveFilters ? (
            <ApplicationsFilters
              filters={filters}
              programs={programs.map((p) => ({
                programId: p.programId,
                name: p.name,
              }))}
              onFiltersChange={setFilters}
              onReset={handleResetFilters}
            />
          ) : null}

          {error ? (
            <div className="rounded-xl border border-border p-6 text-center">
              <p className="mb-4 text-red-600 dark:text-red-400">
                Error: We could not fetch the applications.
                <br />
                We have been notified and are looking into it.
              </p>
              <button
                type="button"
                onClick={() => refresh()}
                className="flex items-center gap-2 mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : (
            <ApplicationsList
              applications={enrichedApplications}
              communityId={communitySlug}
              isLoading={isLoading}
              showCommunity={!communitySlug}
              emptyMessage="No applications match your filters"
              emptyDescription="Try adjusting your filters to see more results."
            />
          )}
        </>
      )}

      {communitySlug ? (
        <ApplicationLookupModal
          isOpen={isLookupOpen}
          onClose={() => setIsLookupOpen(false)}
          communitySlug={communitySlug}
        />
      ) : null}

      {applications.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
