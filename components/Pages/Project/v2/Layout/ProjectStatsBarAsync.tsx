import { calculateProfileStats } from "@/services/project-profile.service";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import {
  getProjectGrantsCached,
  getProjectUpdatesCached,
} from "@/utilities/queries/prefetchProjectProfile";
import { ProjectStatsBar } from "../StatsBar/ProjectStatsBar";

interface ProjectStatsBarAsyncProps {
  projectId: string;
}

/**
 * Async Server Component that fetches stats data and renders the stats bar.
 *
 * This component:
 * 1. Fetches project, grants, and updates data in parallel using React.cache()
 * 2. Calculates profile statistics
 * 3. Renders the ProjectStatsBar client component with the calculated stats
 *
 * Used with Suspense for streaming - the skeleton shows while this component
 * awaits its data, then streams in when ready.
 */
export async function ProjectStatsBarAsync({ projectId }: ProjectStatsBarAsyncProps) {
  // Fetch all required data in parallel (uses React.cache() for deduplication)
  const [project, grants, updatesResponse] = await Promise.all([
    getProjectCachedData(projectId),
    getProjectGrantsCached(projectId),
    getProjectUpdatesCached(projectId),
  ]);

  // Convert updates response to unified milestones format for stats calculation
  // The raw response needs to be processed similar to useProjectUpdates hook
  const milestones = [
    ...(updatesResponse.projectUpdates || []).map((u) => ({
      uid: u.uid,
      type: "activity" as const,
      title: u.title,
      description: u.description,
      createdAt: u.createdAt || new Date().toISOString(),
      completed: false,
      chainID: 0,
      refUID: "",
      source: { type: "update" as const },
    })),
    ...(updatesResponse.projectMilestones || []).map((m) => ({
      uid: m.uid,
      type: "milestone" as const,
      title: m.title,
      description: m.description,
      createdAt: m.createdAt || new Date().toISOString(),
      completed: m.status === "completed",
      chainID: 0,
      refUID: "",
      source: { type: "milestone" as const },
    })),
    ...(updatesResponse.grantMilestones || []).map((m) => ({
      uid: m.uid,
      type: "grant" as const,
      title: m.title,
      description: m.description,
      createdAt: m.createdAt || new Date().toISOString(),
      completed: m.status === "completed",
      chainID: parseInt(m.chainId, 10) || 0,
      refUID: "",
      source: { type: "grant" as const },
    })),
    ...(updatesResponse.grantUpdates || []).map((u) => ({
      uid: u.uid,
      type: "grant_update" as const,
      title: u.title,
      description: u.text,
      createdAt: u.createdAt || new Date().toISOString(),
      completed: false,
      chainID: u.chainId || 0,
      refUID: u.refUID || "",
      source: { type: "grant_update" as const },
    })),
  ];

  // Calculate stats
  const stats = calculateProfileStats(project, grants, milestones);

  return (
    <ProjectStatsBar
      grants={stats.grantsCount}
      endorsements={stats.endorsementsCount}
      lastUpdate={stats.lastUpdate}
      completeRate={stats.completeRate}
    />
  );
}
