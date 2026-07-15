"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
  reportId: string;
}

/**
 * DEV-496: the admin preview and the public report now share one URL. This
 * legacy `/manage/.../preview` route redirects to `/reports/:runDate`, where a
 * community admin sees the draft preview inline (public sees published only).
 */
export function PortfolioReportPreviewPage({ community, reportId }: Props) {
  const slug = community.details.slug;
  const { data: report, isLoading, isError, refetch } = usePortfolioReport(slug, reportId);
  const { replace } = useRouter();
  const backHref = PAGES.ADMIN.PORTFOLIO_REPORTS(slug);

  const runDate = report?.runDate;
  useEffect(() => {
    if (runDate) {
      replace(PAGES.COMMUNITY.REPORT_DETAIL(slug, runDate));
    }
  }, [runDate, slug, replace]);

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

  if (!isLoading && !report) {
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

  // Loading the report, or redirecting once its run date resolves.
  return (
    <div className="flex items-center justify-center p-12">
      <Spinner />
    </div>
  );
}
