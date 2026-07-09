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
              label: `${c.pendingApplicationsCount} ${pluralize("application", c.pendingApplicationsCount)}`,
            }
          : { tone: "gray" as BadgeTone, label: "Clear" },
    }));

  return { big: communities.length, rows };
}

export function buildReviewsSummary(
  programs: FundingProgram[],
  adminCommunities: DashboardAdminCommunity[] = []
): ModuleSummary {
  const byCommunity = new Map<string, { name: string; applications: number }>();
  // Track every identifier (slug AND uid) a program resolved a community under,
  // so admin communities that key on a different one of the two aren't counted
  // twice when they're the same community.
  const seenIds = new Set<string>();
  const remember = (...ids: Array<string | undefined | null>) => {
    for (const id of ids) if (id) seenIds.add(id.toLowerCase());
  };

  for (const program of programs) {
    const id = program.communitySlug || program.communityUID || "";
    if (!id) continue;
    const entry = byCommunity.get(id) ?? {
      name: program.communityName ?? id,
      applications: 0,
    };
    entry.applications += program.metrics?.totalApplications ?? 0;
    byCommunity.set(id, entry);
    remember(program.communitySlug, program.communityUID);
  }

  // Community admins/owners see their pending applications too, even without
  // an explicit reviewer-role program — skip communities already counted above
  // (matched by either slug or uid) to avoid double-counting the same work.
  for (const community of adminCommunities) {
    if (community.pendingApplicationsCount <= 0) continue;
    const id = community.slug || community.uid;
    if (!id) continue;
    const slugId = community.slug?.toLowerCase();
    const uidId = community.uid?.toLowerCase();
    if ((slugId && seenIds.has(slugId)) || (uidId && seenIds.has(uidId))) continue;
    remember(community.slug, community.uid);
    byCommunity.set(id, {
      name: community.name,
      applications: community.pendingApplicationsCount,
    });
  }

  const withWork = Array.from(byCommunity.values()).filter((c) => c.applications > 0);
  const rows: TileRow[] = [...withWork]
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 3)
    .map((c) => ({
      icon: Eye,
      label: c.name,
      badge: { tone: "amber", label: `${c.applications} to review` },
    }));

  // Count only communities with review work, so the headline agrees with the
  // rows below it (and "1 community" never reads as "1 review pending").
  const communityCount = withWork.length;
  return { big: `${communityCount} ${pluralize("community", communityCount)}`, rows };
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
