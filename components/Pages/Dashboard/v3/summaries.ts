/**
 * Pure builders that turn the dashboard's already-fetched data into bento
 * tile summaries. No hooks, no side effects — safe to call in render.
 */

import { Eye, FileText, Rocket, Users } from "lucide-react";
import pluralize from "pluralize";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { computeProjectPendingActions } from "../utils/pending-actions";
import type { BadgeTone, ModuleSummary, TileRow } from "./primitives";

export function buildProjectsSummary(projects: ProjectWithGrantsResponse[]): ModuleSummary {
  const rows: TileRow[] = [...projects]
    .map((p) => ({ project: p, actions: computeProjectPendingActions(p) }))
    .sort((a, b) => b.actions.milestonesNeedingSubmission - a.actions.milestonesNeedingSubmission)
    .slice(0, 3)
    .map(({ project, actions }) => {
      const title = project.details?.title || "Untitled project";
      let badge: TileRow["badge"];
      if (actions.milestonesNeedingSubmission > 0) {
        badge = {
          tone: "amber",
          label: `${actions.milestonesNeedingSubmission} ${pluralize("milestone", actions.milestonesNeedingSubmission)} pending`,
        };
      } else if (actions.grantsInProgress > 0) {
        badge = {
          tone: "amber",
          label: `${actions.grantsInProgress} ${pluralize("grant", actions.grantsInProgress)} to complete`,
        };
      } else {
        badge = { tone: "green", label: "Clear" };
      }
      return { icon: Rocket, imageUrl: project.details?.logoUrl, label: title, badge };
    });

  return { big: projects.length, rows };
}

export function buildCommunitiesSummary(communities: DashboardAdminCommunity[]): ModuleSummary {
  const rows: TileRow[] = [...communities]
    .sort((a, b) => b.pendingApplicationsCount - a.pendingApplicationsCount)
    .slice(0, 3)
    .map((c) => ({
      icon: Users,
      imageUrl: c.logoUrl,
      label: c.name,
      badge:
        c.pendingApplicationsCount > 0
          ? {
              tone: "amber" as BadgeTone,
              label: `${c.pendingApplicationsCount} ${pluralize("app", c.pendingApplicationsCount)}`,
            }
          : { tone: "gray" as BadgeTone, label: "Clear" },
    }));

  return { big: communities.length, rows };
}

export function buildReviewsSummary(programs: FundingProgram[]): ModuleSummary {
  const byCommunity = new Map<string, { name: string; applications: number }>();
  for (const program of programs) {
    const id = program.communitySlug || program.communityUID || "";
    if (!id) continue;
    const entry = byCommunity.get(id) ?? {
      name: program.communityName ?? id,
      applications: 0,
    };
    entry.applications += program.metrics?.totalApplications ?? 0;
    byCommunity.set(id, entry);
  }

  const rows: TileRow[] = Array.from(byCommunity.values())
    .filter((c) => c.applications > 0)
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 3)
    .map((c) => ({
      icon: Eye,
      label: c.name,
      badge: { tone: "amber", label: `${c.applications} to review` },
    }));

  // Label the headcount so "1" doesn't read as "1 review pending" (which would
  // contradict an "All caught up" row). It counts programs, not open reviews.
  return { big: `${programs.length} ${pluralize("program", programs.length)}`, rows };
}

// Tones mirror the platform's application status colors (see
// components/FundingPlatform/ApplicationList/applicationStatusBadge.tsx):
// pending/resubmitted → blue, revision → yellow, approved → green, rejected → red.
const APPLICATION_BADGE: Partial<Record<ApplicationStatus, { tone: BadgeTone; label: string }>> = {
  approved: { tone: "green", label: "Approved" },
  pending: { tone: "blue", label: "Pending" },
  resubmitted: { tone: "blue", label: "Resubmitted" },
  revision_requested: { tone: "amber", label: "Revision" },
  rejected: { tone: "red", label: "Rejected" },
};

export function buildApplicationsSummary(
  applications: Application[],
  statusCounts: Record<string, number>
): ModuleSummary {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const rows: TileRow[] = applications.slice(0, 3).map((a) => ({
    icon: FileText,
    label: a.programTitle || a.resolvedProjectName || a.communityName || "Application",
    badge: APPLICATION_BADGE[a.status] ?? { tone: "gray", label: a.status },
  }));

  return { big: total, rows };
}
