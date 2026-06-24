"use client";

import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { briefDisplay } from "./fonts";
import { onlinePresenceScore, socialPresenceScore } from "./scoring";
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
    <section className="mb-20 sm:mb-24">
      <header className="mb-6 sm:mb-8">
        <p
          className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground`}
        >
          At a glance
        </p>
        <h2
          className={`${briefDisplay.className} mt-2 text-balance text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.1] tracking-[-0.018em] text-foreground`}
        >
          The candidates, side by side.
        </h2>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className={`${briefDisplay.className} w-full min-w-[640px] border-collapse text-sm`}>
          <thead>
            <tr className="border-y border-border">
              <th
                scope="col"
                className="w-[34%] py-3 pr-4 text-left text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
              >
                Metric
              </th>
              {candidates.map((candidate, i) => (
                <th key={candidate.id} scope="col" className="py-3 pl-4 text-left align-bottom">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.22em] tabular-nums text-brand-emphasis dark:text-brand-subtle">
                    Rank {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] font-medium leading-snug text-foreground">
                    {humanizeCase(candidate.organizationName ?? "Unidentified", "title")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.key} className="border-b border-border/50">
                <th
                  scope="row"
                  className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {metric.label}
                </th>
                {candidates.map((candidate) => {
                  const value = metric.value(candidate);
                  return (
                    <td
                      key={`${candidate.id}-${metric.key}`}
                      className={`py-3 pl-4 align-baseline tabular-nums ${
                        metric.emphasis
                          ? "text-foreground text-base font-medium"
                          : "text-foreground/80"
                      }`}
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
