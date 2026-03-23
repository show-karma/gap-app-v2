import { type ReactNode, Suspense } from "react";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
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
    <Suspense fallback={<ProjectProfileLayoutSkeleton />}>
      <ProjectProfileLayout serverSidePanel={serverSidePanel}>{children}</ProjectProfileLayout>
    </Suspense>
  );
}
