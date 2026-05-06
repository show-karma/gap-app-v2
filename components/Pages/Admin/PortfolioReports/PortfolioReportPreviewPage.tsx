"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PortfolioReportDocumentView } from "@/components/Pages/Community/PortfolioReports/PortfolioReportDocumentView";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
  reportId: string;
}

export function PortfolioReportPreviewPage({ community, reportId }: Props) {
  const slug = community.details.slug;
  const { data: report, isLoading, isError, refetch } = usePortfolioReport(slug, reportId);
  const backHref = PAGES.ADMIN.PORTFOLIO_REPORTS(slug);

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
          <p className="text-zinc-500">Failed to load the report preview. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to portfolio reports
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-zinc-500">Report not found.</p>
        <Link
          href={backHref}
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to portfolio reports
        </Link>
      </div>
    );
  }

  const bannerText = report.publishedAt
    ? "Preview mode — admin view of this report."
    : "Preview mode — this draft is only visible to community admins.";

  return (
    <PortfolioReportDocumentView
      community={community}
      runDate={report.runDate}
      report={report}
      backHref={backHref}
      backLabel="Back to portfolio reports"
      bannerText={bannerText}
      exportContext={{ communitySlug: slug, reportId }}
    />
  );
}
