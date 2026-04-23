"use client";

import { AlertTriangle, ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePublishedReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { BackToTop } from "./BackToTop";
import { ReadingProgress } from "./ReadingProgress";

interface Props {
  community: Community;
  month: string;
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

export function PublicReportViewPage({ community, month }: Props) {
  const slug = community.details.slug;
  const { data: report, isLoading, isError, refetch } = usePublishedReport(slug, month);

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
        <p className="text-zinc-500">No published report found for {formatMonth(month)}.</p>
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

  const monthLabel = formatMonth(month);

  return (
    <>
      <ReadingProgress />
      <div className="px-6 pt-6 pb-10 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <li>
              <Link
                href={`/community/${slug}/reports`}
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Reports
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
          <h1
            className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100"
            style={{ viewTransitionName: "report-hero" }}
          >
            {monthLabel}
          </h1>
          <p
            className="mt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400"
            style={{ viewTransitionName: "report-meta" }}
          >
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
          {report.publishedAt && (
            <>
              <span className="mx-2">·</span>
              <span>Published {formatDate(report.publishedAt)}</span>
            </>
          )}
        </footer>
      </div>
      <BackToTop />
    </>
  );
}
