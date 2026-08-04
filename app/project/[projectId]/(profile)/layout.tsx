import type { ReactNode } from "react";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { SidebarProfileCardStatic } from "@/components/Pages/Project/v2/SidePanel/SidebarProfileCardStatic";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{ projectId: string }>;

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 *
 * Async RSC that fetches project data server-side and renders a static sidebar card
 * into the initial HTML, eliminating the blank-content LCP problem.
 *
 * Deliberately NO Suspense boundary here (DEV-612): project routes are
 * sitemap-crawlable and render dynamically, so a boundary here made the whole
 * profile (including the server-rendered sidebar card) stream as a hidden
 * late chunk that no-JS readers never see. The old comment claimed the
 * boundary was required for useSearchParams(); that requirement only applies
 * to statically prerendered routes, and every route in this app is dynamic
 * (root layout reads headers()). Verified against the production build: the
 * build passes and the profile content lands in the initially visible HTML.
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

  return <ProjectProfileLayout serverSidePanel={serverSidePanel}>{children}</ProjectProfileLayout>;
}
