"use client";

import { CheckCircle2, FileText, Send, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/Pages/Dashboard/v3/primitives";
import { SoftIcon } from "@/components/Pages/Dashboard/v3/SoftIcon";
import { BTN_BASE, BTN_MD, BTN_PRIMARY, SK } from "@/components/Pages/Dashboard/v3/soft-classes";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorReports } from "@/hooks/useDonorReports";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ReportListPanel } from "../report-list/ReportListPanel";

function StatsSkeleton() {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
      {[0, 1, 2, 3].map((i) => (
        <div className={cn(SK, "h-[104px] w-full rounded-sf-tile")} key={i} />
      ))}
    </div>
  );
}

interface ResearchStat {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName: string;
}

function ResearchStatsGrid({ items }: { items: ResearchStat[] }) {
  return (
    <section
      aria-label="Report overview"
      className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]"
    >
      {items.map((item) => (
        <div
          className="flex min-h-[104px] items-center justify-between gap-4 rounded-sf-tile border border-sf-line bg-sf-card px-5 py-4"
          key={item.label}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate text-[13px] font-medium text-sf-ink">{item.label}</p>
            <p className="text-2xl font-[700] leading-none tracking-[-0.025em] text-sf-heading">
              {item.value}
            </p>
          </div>
          <span
            aria-hidden="true"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${item.iconClassName}`}
          >
            {item.icon}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Page size for the stats query — also the threshold past which "Reports"
 * can't tell a true total from a full page (see `reportsStatLabel` below). */
const REPORTS_STAT_LIMIT = 25;

/**
 * Header stat strip — total reports, completed, shared, active personas.
 * Derived entirely from data the page already fetches for the list below
 * (no new endpoints): `useDonorReports` and `useDonorHandles`. "Total
 * reports" reflects the most recent 25 (the list's page size), same as
 * every other figure here — there is no report-count endpoint to total
 * across all pages.
 */
function ReportsStats() {
  const reportsQuery = useDonorReports({ limit: REPORTS_STAT_LIMIT });
  const handlesQuery = useDonorHandles({ limit: 200 });

  if (reportsQuery.isLoading) {
    return <StatsSkeleton />;
  }

  if (reportsQuery.isError) {
    return (
      <ErrorState
        message="Unable to load your report stats."
        onRetry={() => reportsQuery.refetch()}
      />
    );
  }

  const reports = reportsQuery.data?.items ?? [];
  const completed = reports.filter(
    (r) => r.status === "complete" || r.status === "fast_complete"
  ).length;
  const shared = reports.filter((r) => r.hasShareToken).length;
  // Handles ("Personas" in the UI) degrade to "—" rather than blocking the
  // whole stat strip — the same graceful-degrade posture as RateLimitCounter.
  const personas = handlesQuery.isSuccess ? (handlesQuery.data?.items.length ?? 0) : null;

  // A full page (== the query limit) can't be told apart from a true total
  // of exactly that many — show "25+" rather than implying an exact count.
  const reportsStat =
    reports.length >= REPORTS_STAT_LIMIT ? `${REPORTS_STAT_LIMIT}+` : reports.length;

  const items: ResearchStat[] = [
    {
      label: "Reports",
      value: reportsStat,
      icon: <FileText className="h-5 w-5" />,
      iconClassName: "bg-blue-50 text-blue-600 dark:bg-blue-500/[.14] dark:text-blue-300",
    },
    {
      label: "Completed",
      value: completed,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconClassName: "bg-green-50 text-green-700 dark:bg-green-500/[.14] dark:text-green-300",
    },
    {
      label: "Shared",
      value: shared,
      icon: <Send className="h-5 w-5" />,
      iconClassName: "bg-violet-50 text-violet-600 dark:bg-violet-500/[.14] dark:text-violet-300",
    },
    {
      label: "Personas",
      value: personas ?? "—",
      icon: <Users className="h-5 w-5" />,
      iconClassName: "bg-brand-50 text-brand-700 dark:bg-brand-500/[.14] dark:text-brand-300",
    },
  ];

  return <ResearchStatsGrid items={items} />;
}

/**
 * Reports (section home) — the list-first advisor landing page (redesign
 * P1, spec 2.3). The advisor gate (loading/redirect/error) now lives in
 * `DonorResearchShell`, which wraps this component — by the time it
 * mounts, an advisor is guaranteed to exist.
 */
export function DonorResearchHome() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-sf-heading">Reports</h1>
          <p className="mt-1 text-[13.5px] text-sf-muted">
            Ranked nonprofit recommendations for your donor personas, sourced from IRS Pub 78,
            recent 990 filings, and live activity signals.
          </p>
        </div>
        <Link className={cn(BTN_BASE, BTN_MD, BTN_PRIMARY)} href={PAGES.DONOR_RESEARCH.NEW}>
          <SoftIcon className="h-4 w-4" name="plus" />
          New report
        </Link>
      </header>

      <ReportsStats />

      <ReportListPanel />
    </div>
  );
}
