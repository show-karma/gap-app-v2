"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import TablePagination from "@/components/Utilities/TablePagination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAdvisors } from "@/hooks/useAdminDonorResearch";
import { Link } from "@/src/components/navigation/Link";
import type { AdminAdvisor, AdminAdvisorReportSummary } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function AdminAdvisorsList() {
  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    clearOnDefault: true,
    parse: (value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    },
    serialize: (value) => String(value),
  });

  const { data, isLoading, isError, refetch, isFetching } = useAdminAdvisors({
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Nonprofit research — advisors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every donor advisor, their donors, and the reports they have generated. Open a report to
          see exactly what the advisor sees.
        </p>
      </header>

      {isLoading ? <AdvisorsSkeleton /> : null}

      {isError ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the advisors. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && data ? (
        data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No advisors have onboarded yet.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {data.total} {pluralize("advisor", data.total)}
              {isFetching ? " · refreshing…" : ""}
            </p>
            <ul className="flex flex-col gap-4">
              {data.items.map((advisor) => (
                <li key={advisor.id}>
                  <AdvisorCard advisor={advisor} />
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <TablePagination
                currentPage={page}
                setCurrentPage={setPage}
                totalPosts={data.total}
                postsPerPage={PAGE_SIZE}
              />
            </div>
          </>
        )
      ) : null}
    </div>
  );
}

function AdvisorCard({ advisor }: { advisor: AdminAdvisor }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-base font-semibold text-foreground">
            {advisor.name || advisor.displayName}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {advisor.rateLimitTier}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{advisor.email || "No email on file"}</span>
          {advisor.orgName ? <span>· {advisor.orgName}</span> : null}
          <span className="font-mono text-xs" title={advisor.walletAddress}>
            · {truncateAddress(advisor.walletAddress)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {advisor.donorCount} {pluralize("donor", advisor.donorCount)} · {advisor.reportCount}{" "}
          {pluralize("report", advisor.reportCount)} · joined {formatDate(advisor.createdAt)}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {advisor.donors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No donors yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {advisor.donors.map((donor) => (
              <li key={donor.handleId}>
                <p className="text-sm font-medium text-foreground">{donor.opaqueLabel}</p>
                {donor.reports.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No reports yet.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1">
                    {donor.reports.map((report) => (
                      <li key={report.id}>
                        <ReportLink report={report} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReportLink({ report }: { report: AdminAdvisorReportSummary }) {
  return (
    <Link
      href={PAGES.DONOR_RESEARCH.ADMIN_REPORT(report.id)}
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-primary hover:underline"
    >
      <span className="capitalize">{report.mode}</span>
      <span className="text-xs text-muted-foreground">· {report.status.replace(/_/g, " ")}</span>
      <span className="text-xs text-muted-foreground">· {formatDate(report.createdAt)}</span>
      {report.hasShareToken ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
          shared
        </span>
      ) : null}
    </Link>
  );
}

function AdvisorsSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card>
            <CardHeader className="border-b border-border">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
