"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "./Header/ProjectHeader";
import { ProjectMainContent } from "./MainContent/ProjectMainContent";
import { ProjectSidePanel } from "./SidePanel/ProjectSidePanel";
import { ProjectStatsBar } from "./StatsBar/ProjectStatsBar";

interface ProjectProfilePageProps {
  className?: string;
}

/**
 * ProjectProfilePage is the main orchestrator for the new 2-column project profile layout.
 *
 * Layout:
 * - Desktop: 2-column (Side Panel 324px + Main Content flex)
 * - Mobile: Single column (Header, Stats, Tabs, Content)
 *
 * Components:
 * - ProjectHeader: Profile, name, badge, socials, description, stage
 * - ProjectStatsBar: Horizontal stats (desktop scroll, mobile grid)
 * - ProjectSidePanel: Donate, Endorse, Subscribe, QuickLinks (desktop only)
 * - ProjectMainContent: Tabs, Filters, ActivityFeed
 */
export function ProjectProfilePage({ className }: ProjectProfilePageProps) {
  const { projectId } = useParams();
  const { project, isLoading: isProjectLoading } = useProject(projectId as string);
  const { isProjectAdmin } = useProjectStore();

  // Fetch grants using dedicated hook
  const { grants } = useProjectGrants(project?.uid || (projectId as string));

  // Fetch updates and impacts for activity feed
  const { milestones = [] } = useProjectUpdates(projectId as string);
  const { impacts = [] } = useProjectImpacts(projectId as string);

  // Check if project is verified (has attestation or other verification)
  const isVerified = useMemo(() => {
    // For now, we'll consider projects with grants as verified
    return grants.length > 0;
  }, [grants]);

  // Combine milestones and impacts for activity feed
  const allUpdates = useMemo((): UnifiedMilestone[] => {
    const impactItems = impacts.map((impact) => ({
      uid: impact.uid,
      type: "impact" as const,
      title: impact.data?.work || "Impact",
      description: impact.data?.impact,
      createdAt: impact.createdAt || new Date().toISOString(),
      completed: false,
      chainID: 0,
      refUID: impact.refUID,
      source: { type: "impact" },
    }));

    return [...milestones, ...impactItems];
  }, [milestones, impacts]);

  // Count completed milestones
  const completedCount = useMemo(() => {
    return allUpdates.filter((m) => m.completed).length;
  }, [allUpdates]);

  // Calculate stats
  const endorsementsCount = project?.endorsements?.length || 0;
  const grantsCount = grants.length;
  const lastUpdate = allUpdates.length > 0 ? new Date(allUpdates[0].createdAt) : undefined;

  // Loading state
  if (isProjectLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading project...</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} data-testid="project-profile-page">
      {/* Header Section */}
      <ProjectHeader project={project} isVerified={isVerified} />

      {/* Stats Bar */}
      <ProjectStatsBar
        grants={grantsCount}
        endorsements={endorsementsCount}
        lastUpdate={lastUpdate}
      />

      {/* Main Layout: Side Panel + Content */}
      <div className="flex flex-row gap-6" data-testid="main-layout">
        {/* Side Panel - Desktop Only */}
        <ProjectSidePanel project={project} />

        {/* Main Content */}
        <ProjectMainContent
          milestones={allUpdates}
          milestonesCount={allUpdates.length}
          completedCount={completedCount}
          fundingCount={grantsCount}
          isAuthorized={isProjectAdmin}
        />
      </div>
    </div>
  );
}
