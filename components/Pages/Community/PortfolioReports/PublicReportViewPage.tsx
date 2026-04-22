"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { usePublishedReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { Spinner } from "@/components/Utilities/Spinner";

interface Props {
  community: Community;
  month: string;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function PublicReportViewPage({ community, month }: Props) {
  const slug = community.details.slug;
  const { data: report, isLoading, error } = usePublishedReport(slug, month);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-zinc-500">
          No published report found for {formatMonth(month)}.
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/community/${slug}/reports`}
        className="mb-6 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        All reports
      </Link>

      <article className="prose prose-zinc max-w-none dark:prose-invert">
        <MarkdownPreview source={report.markdown} />
      </article>

      <div className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-400 dark:border-zinc-700">
        Generated {new Date(report.generatedAt).toLocaleDateString()} using{" "}
        {report.modelId}
        {report.publishedAt && (
          <> &middot; Published {new Date(report.publishedAt).toLocaleDateString()}</>
        )}
      </div>
    </div>
  );
}
