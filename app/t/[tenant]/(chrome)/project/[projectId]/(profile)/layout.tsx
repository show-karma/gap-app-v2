import { type ReactNode, Suspense } from "react";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { SidebarProfileCardStatic } from "@/components/Pages/Project/v2/SidePanel/SidebarProfileCardStatic";
import { ProjectTabContentSkeleton } from "@/components/Pages/Project/v2/Skeletons/ProjectTabContentSkeleton";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{ projectId: string }>;

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 *
 * Async RSC that fetches project data server-side and renders a static sidebar card
 * into the initial HTML, eliminating the blank-content LCP problem.
 *
 * Boundary placement is the point of this file (DEV-612). These routes are
 * sitemap-crawlable and render dynamically, so anything inside a Suspense
 * boundary streams as a hidden chunk no-JS readers never see. The identity —
 * sr-only h1 and JSON-LD from the parent layout, the sidebar card, the profile
 * nav — stays outside; only the tab body streams. No loading.tsx may sit at or
 * above this segment, or it would swallow the identity shell too.
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
  try {
    const project = await getProjectCachedData(projectId);
    if (project) {
      serverSidePanel = <SidebarProfileCardStatic project={project} />;
    }
  } catch {
    // If server fetch fails, serverSidePanel stays null.
    // Client-side hooks will fetch data as fallback.
  }

  return (
    <ProjectProfileLayout serverSidePanel={serverSidePanel} projectId={projectId}>
      <Suspense fallback={<ProjectTabContentSkeleton />}>{children}</Suspense>
    </ProjectProfileLayout>
  );
}
