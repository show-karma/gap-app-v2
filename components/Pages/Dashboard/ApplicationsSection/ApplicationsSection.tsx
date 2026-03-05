"use client";

import { RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { ApplicationsFilters } from "@/features/user-applications/components/ApplicationsFilters";
import { ApplicationsList } from "@/features/user-applications/components/ApplicationsList";
import { useUserApplications } from "@/features/user-applications/hooks/use-user-applications";
import { ApplicationLookupModal } from "@/src/features/application-lookup/components/ApplicationLookupModal";

interface ApplicationsSectionProps {
  communitySlug: string;
}

export function ApplicationsSection({ communitySlug }: ApplicationsSectionProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const { programs } = useProgramsWithConfig(communitySlug);

  const { applications, filters, pagination, isLoading, error, setFilters, setPage, refresh } =
    useUserApplications(communitySlug);

  const handleResetFilters = () => {
    setFilters({
      status: "all",
      programId: undefined,
      searchQuery: "",
      dateRange: undefined,
    });
  };

  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending" || a.status === "resubmitted")
        .length,
      approved: applications.filter((a) => a.status === "approved").length,
    };
  }, [applications]);

  const hasNoApplications = stats.total === 0;
  const hasNoFilters = filters.status === "all" && !filters.programId && !filters.searchQuery;
  const shouldShowLookup = hasNoApplications && hasNoFilters && !isLoading;

  return (
    <section id="applications" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">My Applications</h2>
        <p className="text-sm text-muted-foreground">Track and manage your funding applications.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          <p className="text-muted-foreground">
            Total {stats.total === 1 ? "Application" : "Applications"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          <p className="text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
          <p className="text-muted-foreground">Approved</p>
        </div>
      </div>

      {/* Filters */}
      <ApplicationsFilters
        filters={filters}
        programs={programs.map((p) => ({
          programId: p.programId,
          name: p.name,
        }))}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Applications List */}
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
          applications={applications}
          communityId={communitySlug}
          isLoading={isLoading}
          emptyMessage={
            filters.status !== "all" || filters.programId || filters.searchQuery
              ? "No applications match your filters"
              : "No applications found"
          }
          emptyDescription={
            filters.status !== "all" || filters.programId || filters.searchQuery
              ? "Try adjusting your filters to see more results."
              : "You haven't submitted any applications yet."
          }
        />
      )}

      {/* Can't find your application? Card */}
      {shouldShowLookup && (
        <button
          type="button"
          onClick={() => setIsLookupOpen(true)}
          className="w-full rounded-xl border-2 border-border p-6 text-center transition-colors hover:bg-muted/50"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Can't find your application?
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            If you logged in with a different wallet or email, you can look up your application to
            find the correct credential to use.
          </p>
        </button>
      )}

      <ApplicationLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        communitySlug={communitySlug}
      />

      {/* Pagination */}
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
