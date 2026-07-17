"use client";

import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import { onlinePresenceScore, socialPresenceScore } from "./scoring";
import {
  TABLE_BODY_ROW,
  TABLE_CELL_EMPHASIS,
  TABLE_CELL_MONO,
  TABLE_HEAD_CELL,
  TABLE_HEAD_ROW,
} from "./table-classes";
import { formatLocale, humanizeCase, mostRecentMentionDate, relativeDays } from "./text-utils";

interface ComparisonTableProps {
  candidates: readonly ResearchReportCandidate[];
  /** Persisted report weights; when present a "Social presence" row is shown. */
  weights?: CompositeWeights | null;
}

interface MetricRow {
  key: string;
  label: string;
  value: (candidate: ResearchReportCandidate) => string;
  emphasis?: boolean;
}

function buildMetrics(weights: CompositeWeights | null): readonly MetricRow[] {
  return [
    {
      key: "composite",
      label: "Composite",
      value: (c) => `${Math.round(c.composite * 100)}`,
      emphasis: true,
    },
    {
      key: "missionMatch",
      label: "Mission match",
      value: (c) => `${Math.round(c.components.donorMatch * 100)}`,
    },
    {
      key: "onlinePresence",
      label: "Online presence",
      value: (c) => `${Math.round(onlinePresenceScore(c) * 100)}`,
    },
    // Social presence is a DEV-418 five-dimension axis; legacy reports bundle
    // it into online presence, so the row only appears when weights exist.
    ...(weights
      ? [
          {
            key: "socialPresence",
            label: "Social presence",
            value: (c: ResearchReportCandidate) => `${Math.round(socialPresenceScore(c) * 100)}`,
          },
        ]
      : []),
    {
      key: "impactRecency",
      label: "IRS 990 recency",
      value: (c) => `${Math.round(c.components.impactRecency * 100)}`,
    },
    {
      key: "compliance",
      label: "Compliance",
      value: (c) => describeCompliance(c),
    },
    {
      key: "lastMention",
      label: "Last public mention",
      value: (c) => relativeDays(mostRecentMentionDate(c.recentMentions)) ?? "—",
    },
    {
      key: "stateRegistration",
      label: "State registration",
      value: (c) => describeStateRegistration(c.stateRegistrationStatus),
    },
    {
      key: "location",
      label: "Location",
      value: (c) => formatLocale(c.organizationCity, c.organizationState) ?? "—",
    },
  ];
}

/**
 * At-a-glance comparison of the surfaced candidates. Renders as a
 * semantic table with sticky row labels on horizontal scroll, so the
 * advisor can keep "composite" in view while scanning across columns
 * on a phone.
 */
export function ComparisonTable({ candidates, weights = null }: ComparisonTableProps) {
  if (candidates.length < 2) return null;

  const metrics = buildMetrics(weights);

  return (
    <section
      className="rounded-sf-card border border-sf-line bg-sf-card p-6"
      data-section="comparison"
    >
      <header>
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-sf-heading">At a glance</h2>
        <p className="mt-1 text-[13px] text-sf-muted">The candidates, side by side.</p>
      </header>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th scope="col" className={cn(TABLE_HEAD_CELL, "w-[34%] py-3 pr-4 text-left")}>
                Metric
              </th>
              {candidates.map((candidate, i) => (
                <th className="py-3 pl-4 text-left align-bottom" key={candidate.id} scope="col">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums text-brand-emphasis dark:text-brand-subtle">
                    Rank #{i + 1}
                  </span>
                  <span className="mt-1 block text-[13.5px] font-[600] leading-snug text-sf-heading">
                    {humanizeCase(candidate.organizationName ?? "Unidentified", "title")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr className={TABLE_BODY_ROW} key={metric.key}>
                <th className={cn(TABLE_HEAD_CELL, "py-3 pr-4 text-left")} scope="row">
                  {metric.label}
                </th>
                {candidates.map((candidate) => {
                  const value = metric.value(candidate);
                  return (
                    <td
                      className={cn(
                        "py-3 pl-4 align-baseline",
                        metric.emphasis ? cn(TABLE_CELL_EMPHASIS, "text-base") : TABLE_CELL_MONO
                      )}
                      key={`${candidate.id}-${metric.key}`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function describeCompliance(candidate: ResearchReportCandidate): string {
  const checks = candidate.complianceChecks ?? [];
  if (checks.length === 0) return "—";
  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  if (failed > 0) return `${failed} flagged · ${passed}/${checks.length} passed`;
  return `${passed}/${checks.length} passed`;
}

function describeStateRegistration(
  status: ResearchReportCandidate["stateRegistrationStatus"]
): string {
  if (status === "verified") return "Verified";
  if (status === "suspended") return "Suspended";
  if (status === "revoked") return "Revoked";
  if (status === "data_not_yet_indexed") return "Not indexed";
  return "Not verified";
}
