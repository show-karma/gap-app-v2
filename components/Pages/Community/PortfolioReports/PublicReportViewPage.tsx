"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PortfolioReportDocumentView } from "@/components/Pages/Community/PortfolioReports/PortfolioReportDocumentView";
import { Spinner } from "@/components/Utilities/Spinner";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import {
  useAdminReportByRunDate,
  usePublishedReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { formatRunDate } from "@/utilities/portfolio-reports/period";

interface Props {
  community: Community;
  runDate: string;
}

export function PublicReportViewPage({ community, runDate }: Props) {
  const slug = community.details.slug;
  const {
    data: published,
    isLoading: publishedLoading,
    isError,
    refetch,
  } = usePublishedReport(slug, runDate);

  // DEV-496: the admin "preview" and the public report share this one URL. When
  // there's no published report, a community admin can still see the draft here
  // (the list endpoint is auth-gated, so non-admins never receive it).
  const publishedMissing = !publishedLoading && !published;
  const { isCommunityAdmin, isLoading: adminLoading } = useIsCommunityAdmin(slug);
  const { data: draft, isLoading: draftLoading } = useAdminReportByRunDate(
    slug,
    runDate,
    publishedMissing && isCommunityAdmin
  );

  const report = published ?? draft ?? null;
  const resolving =
    publishedLoading || (publishedMissing && (adminLoading || (isCommunityAdmin && draftLoading)));

  if (resolving) {
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

  // Published reports render as the public view for everyone. An unpublished
  // draft only reaches here for a community admin — badge it as an admin preview.
  const isDraftPreview = !report.publishedAt;
  const bannerText = isDraftPreview
    ? "Preview mode — this draft is only visible to community admins."
    : undefined;

  return (
    <PortfolioReportDocumentView
      community={community}
      runDate={runDate}
      report={report}
      backHref={`/community/${slug}/reports`}
      backLabel="Reports"
      bannerText={bannerText}
      isAdmin={isDraftPreview}
    />
  );
}
