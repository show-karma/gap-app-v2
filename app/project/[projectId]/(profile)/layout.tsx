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
 * Boundary placement is the whole point of this file (DEV-612). Project routes
 * are sitemap-crawlable and render dynamically, so anything inside a Suspense
 * boundary streams as a hidden late chunk (`<div hidden id="S:n">`) that a
 * reader without JavaScript never sees. So the split is:
 *
 *   - OUTSIDE the boundary — the project's semantic identity: the sr-only <h1>
 *     and JSON-LD/breadcrumbs from the parent layout, plus this layout's
 *     SidebarProfileCardStatic (name, description, socials) and the profile
 *     navigation. These land in the initially visible HTML.
 *   - INSIDE the boundary — the tab body, which is secondary content: the
 *     default activity feed blocks on `getProjectFeed`, and the other tabs on
 *     their own client queries. Keeping it out of the critical path is what
 *     lets the identity shell reach the wire on the first flush.
 *
 * There is deliberately NO loading.tsx at or above this segment: a boundary
 * any higher would swallow the identity shell itself, which is the regression
 * DEV-612 exists to fix. The per-tab route-local loading.tsx files below stay
 * as they are — they nest harmlessly inside this boundary and still give
 * client navigation its instant tab-specific skeleton.
 *
 * The Suspense boundary lives in this server layout but its children are
 * rendered by the client `ProjectProfileLayout` (as its `children` prop, into
 * the tab-content slot). That composition is fine — the boundary is an RSC
 * node passed through a client component, the same shape Next's own
 * loading.tsx produces — and is verified against the production build.
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
    <ProjectProfileLayout serverSidePanel={serverSidePanel}>
      <Suspense fallback={<ProjectTabContentSkeleton />}>{children}</Suspense>
    </ProjectProfileLayout>
  );
}
