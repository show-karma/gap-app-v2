"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCommunityAccent } from "@/hooks/useCommunityAccent";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";
import formatCurrency from "@/utilities/formatCurrency";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

export function ImpactOutcomes() {
  const params = useParams<{ communityId: string }>();
  const communityId = params.communityId;
  const accent = useCommunityAccent(communityId);
  const { community } = useCommunityDetails(communityId);
  const slug = community?.details?.slug ?? communityId;

  const { data: stats } = useQuery({
    queryKey: ["community-stats", communityId],
    queryFn: () => getCommunityStats(slug || communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
  });

  if (!stats) return null;

  const projects = stats.totalProjects ?? 0;
  const grants = stats.totalGrants ?? 0;
  const totalMilestones = stats.totalMilestones ?? 0;
  const breakdown = stats.projectUpdatesBreakdown;
  const completedMilestones = breakdown
    ? breakdown.projectCompletedMilestones + breakdown.grantCompletedMilestones
    : 0;
  const projectUpdates = breakdown?.projectUpdates ?? 0;
  const grantUpdates = breakdown?.grantUpdates ?? 0;
  const completionPct =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const items: Array<[string, string]> = [];
  if (grants > 0) items.push([formatCurrency(grants), "grants tracked across the community"]);
  if (projects > 0) items.push([formatCurrency(projects), "funded teams shipping work"]);
  if (totalMilestones > 0) {
    items.push([
      `${formatCurrency(completedMilestones)} of ${formatCurrency(totalMilestones)}`,
      "milestones shipped",
    ]);
  }
  if (completionPct > 0) items.push([`${completionPct}%`, "milestone completion rate"]);
  if (projectUpdates > 0)
    items.push([formatCurrency(projectUpdates), "project updates published by teams"]);
  if (grantUpdates > 0)
    items.push([formatCurrency(grantUpdates), "grant updates from funded programs"]);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="impact-outcomes-title"
      className="rounded-[20px] bg-secondary p-6 md:p-8"
    >
      <h3
        id="impact-outcomes-title"
        className="mb-5 text-xl md:text-[22px] font-semibold tracking-[-0.02em] text-foreground"
      >
        Outcomes delivered
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([value, label]) => (
          <div
            key={label}
            className="flex items-baseline gap-3.5 rounded-xl border border-border bg-background p-4"
          >
            <span
              className="text-xl md:text-[22px] font-semibold tracking-[-0.02em] tabular-nums whitespace-nowrap"
              style={{ color: accent }}
            >
              {value}
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
