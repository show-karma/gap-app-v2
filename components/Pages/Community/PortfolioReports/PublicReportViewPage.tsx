"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PortfolioReportDocumentView } from "@/components/Pages/Community/PortfolioReports/PortfolioReportDocumentView";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePublishedReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { formatRunDate } from "@/utilities/portfolio-reports/period";

interface Props {
  community: Community;
  runDate: string;
}

export function PublicReportViewPage({ community, runDate }: Props) {
  const slug = community.details.slug;
  const { data: report, isLoading, isError, refetch } = usePublishedReport(slug, runDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-zinc-500">Failed to load the report. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href={`/community/${slug}/reports`}
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to reports
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-zinc-500">
          No published report found for {formatRunDate(runDate).label}.
        </p>
        <Link
          href={`/community/${slug}/reports`}
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to reports
        </Link>
      </div>
    );
  }

  return (
    <PortfolioReportDocumentView
      community={community}
      runDate={runDate}
      report={report}
      backHref={`/community/${slug}/reports`}
      backLabel="Reports"
    />
  );
}
