import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { ProjectHeader } from "../Header/ProjectHeader";

interface ProjectHeaderAsyncProps {
  projectId: string;
}

/**
 * Async Server Component that fetches project data and renders the header.
 *
 * This component:
 * 1. Fetches project data on the server using React.cache() for deduplication
 * 2. Determines verification status
 * 3. Renders the ProjectHeader client component with the data
 *
 * Used with Suspense for streaming - the skeleton shows while this component
 * awaits its data, then streams in when ready.
 */
export async function ProjectHeaderAsync({ projectId }: ProjectHeaderAsyncProps) {
  const project = await getProjectCachedData(projectId);

  // Note: Verification status is determined by grants count in the client-side useProjectProfile hook.
  // This server component doesn't have access to grants data, so we default to false.
  // The client will hydrate with the correct value when it has the full profile data.
  const isVerified = false;

  return <ProjectHeader project={project} isVerified={isVerified} />;
}
