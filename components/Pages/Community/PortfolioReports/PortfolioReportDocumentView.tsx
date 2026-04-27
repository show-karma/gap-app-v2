import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { BackToTop } from "./BackToTop";
import { ReadingProgress } from "./ReadingProgress";

interface Props {
  community: Community;
  month: string;
  report: PortfolioReport;
  backHref: string;
  backLabel?: string;
  bannerText?: string;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
  month,
  report,
  backHref,
  backLabel = "Reports",
  bannerText,
}: Props) {
  const slug = community.details.slug;
  const monthLabel = formatMonth(month);

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
              {monthLabel}
            </li>
          </ol>
        </nav>

        <header className="mb-8 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {community.details.name ?? slug} · Portfolio report
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
            {monthLabel}
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {report.publishedAt ? `Published ${formatDate(report.publishedAt)}` : "Draft"}
          </p>
        </header>

        <article className="report-article prose prose-zinc max-w-none dark:prose-invert">
          <MarkdownPreview source={report.markdown} />
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
