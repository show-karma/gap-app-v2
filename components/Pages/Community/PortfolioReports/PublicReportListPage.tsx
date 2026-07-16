"use client";

import { AlertTriangle, ArrowUpRight, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { PortfolioReport } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { reportExcerpt } from "@/utilities/portfolio-reports/excerpt";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { ReportTimelineScrubber, type TimelineEntry } from "./ReportTimelineScrubber";

interface Props {
  community: Community;
}

/**
 * Sentinel for "no type filter". Radix `SelectItem` rejects an empty string
 * value, and the URL param is dropped entirely (set to null) at this value.
 */
const ALL_TYPES = "all";

interface ReportType {
  id: string;
  label: string;
}

function formatPublished(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTitle(content: string): string | null {
  if (!content) return null;
  const titleTag = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1]?.trim()) return decodeBasicEntities(titleTag[1]).trim();
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const stripped = h1[1].replace(/<[^>]+>/g, "").trim();
    if (stripped) return decodeBasicEntities(stripped);
  }
  const mdHeading = content.match(/^#{1,2}\s+(.+)$/m);
  if (mdHeading?.[1]) return mdHeading[1].trim();
  return null;
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
 * What a reader sees as the report's name, most-specific first:
 *
 * 1. `title` — admin-authored, the only source that can name the period the
 *    report covers (nothing else records it).
 * 2. `reportConfigName` — shared by every run of that config, so a year of
 *    monthly reports all read identically. This is the pre-DEV-520 behaviour
 *    and remains the fallback for untitled reports.
 * 3. a heading scraped from the rendered content, then the run date.
 */
function resolveReportTitle(report: PortfolioReport): string {
  return (
    report.title ??
    report.reportConfigName ??
    extractTitle(report.content) ??
    formatRunDate(report.runDate).label
  );
}

/**
 * The report *config* is the closest thing the system has to a "report type" —
 * each one is effectively a template ("Monthly Pods Report", "Bi-Weekly
 * Progress Report"), and every report names its originating config.
 */
function deriveReportTypes(reports: PortfolioReport[]): ReportType[] {
  const byId = new Map<string, string>();
  for (const report of reports) {
    if (!byId.has(report.reportConfigId)) {
      byId.set(report.reportConfigId, report.reportConfigName ?? "Untitled report type");
    }
  }
  return Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

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
      // Keyed by report id, not runDate: two configs can publish on the same
      // day, and a runDate key would collide and scrub to the wrong report.
      key: r.id,
      year: Number(yearStr),
      label: `${monthAbbr} ${Number(dayStr)}`,
      hasReport: true,
    };
  });
}

const ReportListItem = memo(function ReportListItem({
  report,
  slug,
  isFirst,
}: {
  report: PortfolioReport;
  slug: string;
  isFirst: boolean;
}) {
  const excerpt = reportExcerpt(report, 280);
  const fmt = formatRunDate(report.runDate);
  return (
    <article
      data-report-key={report.id}
      className={`py-8 ${isFirst ? "" : "border-t border-zinc-200 dark:border-zinc-800"}`}
    >
      <Link
        href={PAGES.COMMUNITY.REPORT_DETAIL(slug, report.runDate, report.reportConfigSlug)}
        className="group/link flex items-start gap-8"
      >
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {fmt.badge}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 transition-colors group-hover/link:text-blue-600 sm:text-2xl dark:text-zinc-100 dark:group-hover/link:text-blue-400">
            {resolveReportTitle(report)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {report.publishedAt && <span>Published {formatPublished(report.publishedAt)}</span>}
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
});

function ReportTypeFilterSelect({
  types,
  value,
  onChange,
}: {
  types: ReportType[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="font-mono uppercase tracking-wider">Type</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Filter reports by type" className="h-8 max-w-[16rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES}>All report types</SelectItem>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PublicReportListPage({ community }: Props) {
  const slug = community.details.slug;
  const { data: reports, isLoading, isError, refetch } = usePublishedReports(slug);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: ALL_TYPES });

  const sortedReports = useMemo(
    () => (reports ? [...reports].sort((a, b) => b.runDate.localeCompare(a.runDate)) : []),
    [reports]
  );

  const reportTypes = useMemo(() => deriveReportTypes(sortedReports), [sortedReports]);

  const filteredReports = useMemo(
    () =>
      typeFilter === ALL_TYPES
        ? sortedReports
        : sortedReports.filter((report) => report.reportConfigId === typeFilter),
    [sortedReports, typeFilter]
  );

  // Setting null (rather than the sentinel) drops `?type=` from the URL.
  const handleTypeChange = (next: string) => {
    setTypeFilter(next === ALL_TYPES ? null : next);
  };

  const timeline = useMemo(() => deriveTimeline(filteredReports), [filteredReports]);

  useEffect(() => {
    // The active dot must not survive a filter change that removed it. Keyed on
    // the filter rather than on `filteredReports`, whose identity changes on
    // every refetch — clearing it there would jump the timeline to the top each
    // time data refreshed. Re-observing below on refetch is harmless: seeding
    // keeps any dot already set.
    seededRef.current = false;
    setActiveKey(null);
  }, [typeFilter]);

  useEffect(() => {
    if (filteredReports.length === 0) return;
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
  }, [filteredReports]);

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
      <div className="w-full max-w-full py-2 animate-fade-in-up">
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
      <div className="w-full max-w-full py-2 animate-fade-in-up">
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

  const count = filteredReports.length;
  const latest = filteredReports[0];

  return (
    <div className="w-full max-w-full -my-4 py-2 animate-fade-in-up">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
            Portfolio Reports
          </h1>
          {count > 0 && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {count} {pluralize("report", count)} · Latest {formatRunDate(latest.runDate).label}
            </p>
          )}
        </div>
        {reportTypes.length > 1 && (
          <ReportTypeFilterSelect
            types={reportTypes}
            value={typeFilter}
            onChange={handleTypeChange}
          />
        )}
      </header>

      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <FileText className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">No reports of this type.</p>
          <button
            type="button"
            onClick={() => handleTypeChange(ALL_TYPES)}
            className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Show all reports
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[160px_1fr]">
          <ReportTimelineScrubber
            entries={timeline}
            activeKey={activeKey}
            onJumpTo={handleJumpTo}
          />

          <div ref={sectionsRef} className="min-w-0">
            {filteredReports.map((report, index) => (
              <ReportListItem key={report.id} report={report} slug={slug} isFirst={index === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
