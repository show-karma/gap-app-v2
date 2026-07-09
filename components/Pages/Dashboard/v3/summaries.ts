/**
 * Pure builders that turn the dashboard's already-fetched data into bento
 * tile summaries. No hooks, no side effects — safe to call in render.
 */

import { FileText, Rocket, Users } from "lucide-react";
import pluralize from "pluralize";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
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
              label: `${c.pendingApplicationsCount} ${pluralize("application", c.pendingApplicationsCount)}`,
            }
          : { tone: "gray" as BadgeTone, label: "Clear" },
    }));

  return { big: communities.length, rows };
}

// Tones mirror the platform's application status colors (see
// components/FundingPlatform/ApplicationList/applicationStatusBadge.tsx):
// pending/resubmitted → blue, under review/revision → amber, approved → green,
// rejected → red, draft → gray.
const APPLICATION_BADGE: Partial<Record<ApplicationStatus, { tone: BadgeTone; label: string }>> = {
  draft: { tone: "gray", label: "Draft" },
  pending: { tone: "blue", label: "Pending" },
  resubmitted: { tone: "blue", label: "Resubmitted" },
  under_review: { tone: "amber", label: "Under review" },
  revision_requested: { tone: "amber", label: "Revision" },
  approved: { tone: "green", label: "Approved" },
  rejected: { tone: "red", label: "Rejected" },
};

/**
 * Maps an application status to its badge tone + label. Single source of truth
 * shared by the bento tile summary and the "My applications" drill-in list, so
 * the two never drift. Unknown statuses fall back to a gray raw-label badge.
 */
export function getApplicationBadge(status: ApplicationStatus): { tone: BadgeTone; label: string } {
  return APPLICATION_BADGE[status] ?? { tone: "gray", label: status };
}

export function buildApplicationsSummary(
  applications: Application[],
  statusCounts: Record<string, number>
): ModuleSummary {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const rows: TileRow[] = applications.slice(0, 3).map((a) => ({
    icon: FileText,
    label: a.programTitle || a.resolvedProjectName || a.communityName || "Application",
    badge: getApplicationBadge(a.status),
  }));

  return { big: total, rows };
}
