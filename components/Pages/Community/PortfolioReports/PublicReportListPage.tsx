"use client";

import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";

interface Props {
  community: Community;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function PublicReportListPage({ community }: Props) {
  const slug = community.details.slug;
  const { data: reports, isLoading, isError, refetch } = usePublishedReports(slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 p-12 text-center dark:border-red-900/40">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm text-zinc-500">Failed to load reports. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <FileText className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">No published reports yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Portfolio Reports
      </h1>
      <div className="grid gap-4">
        {reports.map((report: PortfolioReport) => {
          const excerpt = report.markdown.slice(0, 200).replace(/[#*_[\]]/g, "");
          return (
            <Link
              key={report.id}
              href={`/community/${slug}/reports/${report.reportMonth}`}
              className="group block rounded-lg border border-zinc-200 p-5 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            >
              <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                {formatMonth(report.reportMonth)}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{excerpt}...</p>
              {report.publishedAt && (
                <p className="mt-3 text-xs text-zinc-400">
                  Published {new Date(report.publishedAt).toLocaleDateString()}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
