"use client";

import { AlertTriangle, ArrowUpRight, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { reportExcerpt } from "@/utilities/portfolio-reports/excerpt";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { ReportTimelineScrubber, type TimelineEntry } from "./ReportTimelineScrubber";

interface Props {
  community: Community;
}

function formatPublished(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/**
 * One timeline dot per actual published report. The previous biweekly
 * implementation gap-filled missing months — the new model has arbitrary
 * `runDate`s (any day, any cadence) so gap-fill no longer makes sense; we
 * just render what we have.
 */
function deriveTimeline(sortedReports: Array<{ id: string; runDate: string }>): TimelineEntry[] {
  return sortedReports.map((r) => {
    const [yearStr, monthStr, dayStr] = r.runDate.split("-");
    const monthIdx = Number(monthStr) - 1;
    const monthAbbr = MONTH_ABBR[monthIdx] ?? monthStr;
    return {
      key: r.runDate,
      year: Number(yearStr),
      label: `${monthAbbr} ${Number(dayStr)}`,
      hasReport: true,
    };
  });
}

export function PublicReportListPage({ community }: Props) {
  const slug = community.details.slug;
  const { data: reports, isLoading, isError, refetch } = usePublishedReports(slug);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  const sortedReports = useMemo(
    () => (reports ? [...reports].sort((a, b) => b.runDate.localeCompare(a.runDate)) : []),
    [reports]
  );

  const timeline = useMemo(() => deriveTimeline(sortedReports), [sortedReports]);

  useEffect(() => {
    seededRef.current = false;
  }, [sortedReports]);

  useEffect(() => {
    if (sortedReports.length === 0) return;
    const root = sectionsRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-report-key]");
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const target = visible[0]?.target as HTMLElement | undefined;
        if (target?.dataset.reportKey) setActiveKey(target.dataset.reportKey);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 }
    );
    nodes.forEach((node) => {
      observer.observe(node);
    });
    if (!seededRef.current) {
      seededRef.current = true;
      setActiveKey((current) => current ?? nodes[0].dataset.reportKey ?? null);
    }
    return () => observer.disconnect();
  }, [sortedReports]);

  const handleJumpTo = (key: string) => {
    const target = sectionsRef.current?.querySelector<HTMLElement>(`[data-report-key="${key}"]`);
    if (!target) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const top = target.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 p-12 text-center dark:border-red-900/40">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm text-zinc-500">Failed to load reports. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (sortedReports.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <FileText className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">No published reports yet.</p>
        </div>
      </div>
    );
  }

  const count = sortedReports.length;
  const latest = sortedReports[0];

  return (
    <div className="px-6 py-10 lg:px-10">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {count} {count === 1 ? "report" : "reports"} · Latest{" "}
          {formatRunDate(latest.runDate).label}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[160px_1fr]">
        <ReportTimelineScrubber entries={timeline} activeKey={activeKey} onJumpTo={handleJumpTo} />

        <div ref={sectionsRef} className="min-w-0">
          {sortedReports.map((report, index) => {
            const excerpt = reportExcerpt(report, 280);
            const fmt = formatRunDate(report.runDate);
            return (
              <article
                key={report.id}
                data-report-key={report.runDate}
                className={`py-8 ${
                  index !== 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""
                }`}
              >
                <Link
                  href={PAGES.COMMUNITY.REPORT_DETAIL(slug, report.runDate)}
                  className="group/link flex items-start justify-between gap-8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {fmt.badge}
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-900 transition-colors group-hover/link:text-blue-600 sm:text-2xl dark:text-zinc-100 dark:group-hover/link:text-blue-400">
                      {fmt.label}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {report.publishedAt && (
                        <span>Published {formatPublished(report.publishedAt)}</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-blue-500 opacity-0 transition-all duration-200 group-hover/link:opacity-100 dark:text-blue-400">
                        Read report
                        <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className="hidden self-center text-zinc-300 transition-all duration-200 group-hover/link:translate-x-1 group-hover/link:text-blue-500 sm:block dark:text-zinc-700 dark:group-hover/link:text-blue-400"
                  >
                    →
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
