"use client";

import { ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/services/portfolio-reports.service";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { BackToTop } from "./BackToTop";
import { HtmlReportFrame } from "./HtmlReportFrame";
import { ReadingProgress } from "./ReadingProgress";

interface Props {
  community: Community;
  runDate: string;
  report: PortfolioReport;
  backHref: string;
  backLabel?: string;
  bannerText?: string;
  /**
   * When provided, surfaces an "Export PDF" button next to the
   * breadcrumb. Pass `{ communitySlug, reportId }` from contexts where
   * the viewer is authorized to call the admin-scoped PDF endpoint
   * (e.g. the admin /preview tab). Public report views should leave
   * this undefined.
   */
  exportContext?: { communitySlug: string; reportId: string };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function PortfolioReportDocumentView({
  community: _community,
  runDate,
  report,
  backHref,
  backLabel = "Reports",
  bannerText,
  exportContext,
}: Props) {
  const runDateLabel = formatRunDate(runDate).label;
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!exportContext) return;
    setExportingPdf(true);
    try {
      const blob = await downloadReportPdf(exportContext.communitySlug, exportContext.reportId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `portfolio-report-${runDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Failed to export PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <ReadingProgress />
      <div className="px-6 pt-6 pb-10 lg:px-10">
        {bannerText ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {bannerText}
          </div>
        ) : null}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
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
          {exportContext ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf || !report.content}
            >
              <Download className="mr-1 h-3 w-3" />
              {exportingPdf ? "Exporting…" : "Export PDF"}
            </Button>
          ) : null}
        </div>

        <HtmlReportFrame html={report.content} title={`Portfolio report — ${runDateLabel}`} />

        <footer className="mt-12 border-t border-zinc-200 pt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
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
