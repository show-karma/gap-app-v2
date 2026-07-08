"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import pluralize from "pluralize";
import type { ReactNode } from "react";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { donorReportsQueryKey } from "@/hooks/useDonorReports";
import { listResearchReports } from "@/services/donor-research.service";
import { Link } from "@/src/components/navigation/Link";
import type {
  DonorResearchReportStatus,
  ResearchReportList,
  ResearchReportListItem,
} from "@/types/donor-research";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import {
  type BadgeTone,
  EmptyState,
  ErrorState,
  type ModuleStatus,
  type ModuleSummary,
  Section,
  SkeletonList,
  StatTiles,
} from "./primitives";
import { SoftIcon } from "./SoftIcon";
import { badgeClasses } from "./soft-classes";

const REPORTS_LIMIT = 6;

function isTerminalReady(status: DonorResearchReportStatus): boolean {
  return status === "complete" || status === "fast_complete";
}

function reportTitle(item: ResearchReportListItem): string {
  return item.donorHandleLabel || item.criteriaSummary || "Untitled research";
}

function statusBadge(status: DonorResearchReportStatus): {
  tone: BadgeTone;
  label: string;
  icon: string;
} {
  if (isTerminalReady(status)) return { tone: "green", label: "Ready", icon: "check" };
  if (status === "failed") return { tone: "red", label: "Failed", icon: "clock" };
  return { tone: "amber", label: "Generating", icon: "clock" };
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${pluralize("minute", minutes)} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${pluralize("hour", hours)} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${pluralize("day", days)} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${pluralize("month", months)} ago`;
  return `${Math.floor(months / 12)} ${pluralize("year", Math.floor(months / 12))} ago`;
}

/* ── shared data hook (deduped between tile and full view) ─────── */

export interface AdvisorData {
  isAdvisor: boolean;
  advisorLoading: boolean;
  status: ModuleStatus;
  summary?: ModuleSummary;
  reports: ResearchReportListItem[];
  onRetry: () => void;
}

export function useAdvisorData(authenticated: boolean): AdvisorData {
  const advisorQuery = useDonorAdvisor({ enabled: authenticated });
  const isAdvisor = advisorQuery.data != null;

  const reportsQuery = useQuery<ResearchReportList>({
    queryKey: donorReportsQueryKey({ limit: REPORTS_LIMIT }),
    queryFn: () => listResearchReports({ limit: REPORTS_LIMIT }),
    enabled: isAdvisor,
  });

  const reports = reportsQuery.data?.items ?? [];

  let status: ModuleStatus;
  if (reportsQuery.isError) status = "error";
  else if (reportsQuery.isLoading) status = "loading";
  else if (reports.length === 0) status = "empty";
  else status = "ready";

  const summary: ModuleSummary | undefined =
    status === "ready"
      ? {
          big: reports.length,
          rows: reports.slice(0, 3).map((r) => {
            const b = statusBadge(r.status);
            return {
              icon: FileText,
              label: reportTitle(r),
              badge: { tone: b.tone, label: b.label },
            };
          }),
        }
      : undefined;

  return {
    isAdvisor,
    advisorLoading: advisorQuery.isLoading,
    status,
    summary,
    reports,
    onRetry: () => reportsQuery.refetch(),
  };
}

/* ── full drill-in view ───────────────────────────────────────── */

export function AdvisorFullView({ authenticated }: { authenticated: boolean }) {
  const { status, reports, onRetry } = useAdvisorData(authenticated);

  const readyCount = reports.filter((r) => isTerminalReady(r.status)).length;
  const generatingCount = reports.filter(
    (r) => !isTerminalReady(r.status) && r.status !== "failed"
  ).length;

  const action =
    status === "ready" ? (
      <Link
        className="inline-flex items-center gap-1.5 border-b-[1.5px] border-sf-line-strong pb-0.5 text-[13.5px] font-[650] text-sf-ink hover:border-brand-300 hover:text-brand-700"
        href={PAGES.DONOR_RESEARCH.INDEX}
      >
        Open Find Funders
        <SoftIcon name="arrow" className="h-[14px] w-[14px]" />
      </Link>
    ) : null;

  let body: ReactNode;
  if (status === "loading") {
    body = <SkeletonList count={4} />;
  } else if (status === "error") {
    body = (
      <ErrorState message="Unable to load your research reports right now." onRetry={onRetry} />
    );
  } else if (status === "empty") {
    body = (
      <EmptyState
        brand
        icon="compass"
        title="No research reports yet"
        body="Ask an agent to find foundations and grantmaking nonprofits aligned to a mission — every answer cited to a 990 filing."
        primary={{
          label: "Start funder research",
          icon: "search",
          href: PAGES.DONOR_RESEARCH.INDEX,
        }}
        secondary={{ label: "Browse Find Funders", icon: "compass", href: NON_PROFITS_PAGES.HOME }}
      />
    );
  } else {
    body = (
      <>
        <StatTiles
          items={[
            { n: reports.length, l: pluralize("Research report", reports.length), tone: "brand" },
            { n: readyCount, l: "Ready", tone: "green" },
            { n: generatingCount, l: "Generating", tone: "amber" },
          ]}
        />
        <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(264px,1fr))]">
          {reports.map((r) => {
            const b = statusBadge(r.status);
            const updated = timeAgo(r.completedAt ?? r.fastCompletedAt ?? r.createdAt);
            return (
              <Link
                className="flex flex-col gap-3 rounded-sf-tile border border-sf-line bg-sf-elev p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[3px] hover:border-sf-line-strong hover:bg-sf-card hover:shadow-[var(--sf-shadow-card)]"
                href={PAGES.DONOR_RESEARCH.REPORT(r.id)}
                key={r.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={badgeClasses("gray")}>
                    {r.mode === "deep" ? "Deep" : "Fast"}
                  </span>
                  <span className={badgeClasses(b.tone)}>
                    <SoftIcon name={b.icon} className="h-3 w-3" />
                    {b.label}
                  </span>
                </div>
                <div className="text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">
                  {reportTitle(r)}
                </div>
                {updated ? (
                  <div className="text-[12.5px] text-sf-muted">Updated {updated}</div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <Section
      id="advisor"
      icon="compass"
      title="Funder research"
      sub="Your philanthropy sessions and 990-grounded reports"
      action={action}
    >
      {body}
    </Section>
  );
}
