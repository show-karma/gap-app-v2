import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { BackToTop } from "./BackToTop";
import { ReadingProgress } from "./ReadingProgress";

const REPORT_MARKDOWN_COMPONENTS = {
  // Wide tables should scroll horizontally rather than squeezing column widths
  // (e.g. forcing the BATCH column to wrap one character per line).
  table: ({ children, ...rest }: ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto">
      <table {...rest}>{children}</table>
    </div>
  ),
};

interface Props {
  community: Community;
  runDate: string;
  report: PortfolioReport;
  backHref: string;
  backLabel?: string;
  bannerText?: string;
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
}: Props) {
  const slug = community.details.slug;
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

        <nav aria-label="Breadcrumb" className="mb-8">
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

        <header className="mb-8 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {community.details.name ?? slug} · Portfolio report
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
            {runDateLabel}
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {report.publishedAt ? `Published ${formatDate(report.publishedAt)}` : "Draft"}
          </p>
        </header>

        <article className="report-article prose prose-zinc max-w-none dark:prose-invert">
          <MarkdownPreview source={report.markdown} components={REPORT_MARKDOWN_COMPONENTS} />
        </article>

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
