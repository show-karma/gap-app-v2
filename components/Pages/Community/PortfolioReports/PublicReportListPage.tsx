"use client";

import { AlertTriangle, ArrowUpRight, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { ReportTimelineScrubber, type TimelineEntry } from "./ReportTimelineScrubber";

interface Props {
  community: Community;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatPublished(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toExcerpt(markdown: string, maxLength = 240): string {
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^\|.*\|$/.test(trimmed)) return false;
      if (/^[\s|:-]+$/.test(trimmed) && trimmed.includes("-")) return false;
      return true;
    })
    .join("\n");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^>\s?/gm, "");
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  text = text.replace(/(\*\*|__)(.+?)\1/g, "$2");
  text = text.replace(/(\*|_)(.+?)\1/g, "$2");
  text = text.replace(/~~(.+?)~~/g, "$1");
  text = text.replace(/^[-*_]{3,}$/gm, "");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut}…`;
}

function deriveTimeline(reports: PortfolioReport[]): TimelineEntry[] {
  if (reports.length === 0) return [];
  const sorted = [...reports].sort((a, b) => b.reportMonth.localeCompare(a.reportMonth));
  const reportSet = new Set(sorted.map((r) => r.reportMonth));
  const [maxY, maxM] = sorted[0].reportMonth.split("-").map(Number);
  const [minY, minM] = sorted[sorted.length - 1].reportMonth.split("-").map(Number);
  // Total months covered between the oldest and newest report (inclusive).
  const totalMonths = (maxY - minY) * 12 + (maxM - minM) + 1;
  const entries: TimelineEntry[] = [];
  let y = maxY;
  let m = maxM;
  for (let i = 0; i < totalMonths; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    entries.push({ year: y, month: m, key, hasReport: reportSet.has(key) });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return entries;
}

export function PublicReportListPage({ community }: Props) {
  const slug = community.details.slug;
  const { data: reports, isLoading, isError, refetch } = usePublishedReports(slug);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  const sortedReports = useMemo(
    () => (reports ? [...reports].sort((a, b) => b.reportMonth.localeCompare(a.reportMonth)) : []),
    [reports]
  );

  const timeline = useMemo(() => deriveTimeline(sortedReports), [sortedReports]);

  // Reset the "seeded" flag whenever the report set changes so the next active
  // key gets seeded once on the new set.
  useEffect(() => {
    seededRef.current = false;
  }, [sortedReports]);

  // IntersectionObserver — depends only on the report set so it isn't torn down
  // on every scroll.
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
  const months = timeline.length;
  const latest = sortedReports[0];

  return (
    <div className="px-6 py-10 lg:px-10">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
          Portfolio Reports
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {count} {count === 1 ? "report" : "reports"} · {months}
          {months === 1 ? " month" : " months"} covered · Latest {formatMonth(latest.reportMonth)}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[160px_1fr]">
        {/* Sticky scrubber */}
        <ReportTimelineScrubber entries={timeline} activeKey={activeKey} onJumpTo={handleJumpTo} />

        {/* Timeline entries */}
        <div ref={sectionsRef} className="min-w-0">
          {sortedReports.map((report, index) => {
            const excerpt = toExcerpt(report.markdown, 280);
            const [yearStr, monthStr] = report.reportMonth.split("-");
            const indexBadge = `${monthStr} / ${yearStr.slice(2)}`;
            return (
              <article
                key={report.id}
                data-report-key={report.reportMonth}
                className={`py-8 ${
                  index !== 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""
                }`}
              >
                <Link
                  href={`/community/${slug}/reports/${report.reportMonth}`}
                  className="group/link flex items-start justify-between gap-8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {indexBadge}
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-900 transition-colors group-hover/link:text-blue-600 sm:text-2xl dark:text-zinc-100 dark:group-hover/link:text-blue-400">
                      {formatMonth(report.reportMonth)}
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
