"use client";

import { ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { BackToTop } from "./BackToTop";
import { HtmlReportFrame } from "./HtmlReportFrame";
import { ReadingProgress } from "./ReadingProgress";
import { ReportChartsSection } from "./ReportChartsSection";

interface Props {
  community: Community;
  runDate: string;
  report: PortfolioReport;
  backHref: string;
  backLabel?: string;
  bannerText?: string;
  /**
   * `true` when the viewer is an authenticated admin (e.g. the admin
   * `/preview` tab). Controls whether the charts endpoint is called via
   * the auth-aware API client — needed because drafts/failed/generating
   * reports require community-admin auth.
   */
  isAdmin?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function PortfolioReportDocumentView({
  community,
  runDate,
  report,
  backHref,
  backLabel = "Reports",
  bannerText,
  isAdmin = false,
}: Props) {
  const runDateLabel = formatRunDate(runDate).label;

  return (
    <>
      <ReadingProgress />
      <div className="px-6 pt-6 pb-10 lg:px-10">
        {bannerText ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {bannerText}
          </div>
        ) : null}

        <div className="report-print-hide mb-8 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <li>
                <Link
                  href={backHref}
                  className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {backLabel}
                </Link>
              </li>
              <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page" className="font-medium text-zinc-900 dark:text-zinc-100">
                {runDateLabel}
              </li>
            </ol>
          </nav>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={!report.content}
            title="Tip: turn off 'Headers and footers' in the print dialog for a cleaner PDF"
          >
            <Download className="mr-1 h-3 w-3" />
            Export PDF
          </Button>
        </div>

        <div className="report-print-area">
          <HtmlReportFrame html={report.content} title={`Portfolio report — ${runDateLabel}`} />

          <ReportChartsSection
            communitySlug={community.details.slug}
            reportId={report.id}
            authenticated={isAdmin}
          />
        </div>

        <footer className="report-print-hide mt-12 border-t border-zinc-200 pt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <span>Generated {formatDate(report.generatedAt)}</span>
          <span className="mx-2">·</span>
          <span>{report.modelId}</span>
          {report.publishedAt ? (
            <>
              <span className="mx-2">·</span>
              <span>Published {formatDate(report.publishedAt)}</span>
            </>
          ) : null}
        </footer>
      </div>
      <BackToTop />
    </>
  );
}
