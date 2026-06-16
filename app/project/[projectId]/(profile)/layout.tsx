import { type ReactNode, Suspense } from "react";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { ProjectHeaderServer } from "@/components/Pages/Project/v2/MainContent/ProjectHeaderServer";
import { SidebarProfileCardStatic } from "@/components/Pages/Project/v2/SidePanel/SidebarProfileCardStatic";
import { ProjectProfileLayoutSkeleton } from "@/components/Pages/Project/v2/Skeletons";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{ projectId: string }>;

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 *
 * Async RSC that fetches project data server-side and renders a static sidebar card
 * into the initial HTML, eliminating the blank-content LCP problem.
 *
 * Suspense boundary required because ProjectProfileLayout uses useSearchParams(),
 * which needs a Suspense boundary in Next.js App Router production builds.
 */
export default async function ProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { projectId } = await params;

  let serverSidePanel: ReactNode = null;
  let serverHeader: ReactNode = null;
  try {
    const project = await getProjectCachedData(projectId);
    if (project) {
      serverSidePanel = <SidebarProfileCardStatic project={project} />;
      // Renders the project <h1> + full description + tags into the initial
      // HTML of every tab so crawlers see real, indexable content (the root
      // tab otherwise ships only the client-rendered Updates feed).
      serverHeader = <ProjectHeaderServer project={project} />;
    }
  } catch {
    // If server fetch fails, serverSidePanel/serverHeader stay null.
    // Client-side hooks will fetch data as fallback.
  }

  return (
    <Suspense fallback={<ProjectProfileLayoutSkeleton />}>
      <ProjectProfileLayout serverSidePanel={serverSidePanel} serverHeader={serverHeader}>
        {children}
      </ProjectProfileLayout>
    </Suspense>
  );
}
