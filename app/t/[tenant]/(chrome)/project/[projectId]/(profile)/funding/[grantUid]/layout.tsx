import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { getExplorerProjectsPaginatedCached } from "@/services/projects-explorer.cached";
import {
  generateGrantOverviewMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { GrantDetailLayoutClient } from "./GrantDetailLayoutClient";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

const PRERENDERED_PROJECT_SAMPLE = 1;
const PRERENDERED_GRANT_SAMPLE = 2;

/**
 * Real grant uids for a sampled project, prerendered at build.
 *
 * Without a sample here, `[grantUid]` is unknown at build time, and every
 * `useDynamicRouteParams` reader above these routes aborts the prerender — the
 * profile layout's `useParams()`/`usePathname()` among them. That is why the
 * non-nested profile routes passed while these did not: same components, but
 * their params were samples.
 *
 * A boundary is not the alternative: the profile root is Cache-class, so the
 * sample is the lever. Degrades to an empty list — a build with no prerendered
 * grant pages, never a fabricated uid.
 */
export async function generateStaticParams(): Promise<
  Array<{ projectId: string; grantUid: string }>
> {
  try {
    const { payload } = await getExplorerProjectsPaginatedCached({
      page: 1,
      limit: PRERENDERED_PROJECT_SAMPLE,
    });

    const pairs = await Promise.all(
      payload.map(async (project) => {
        const projectId = project.details?.slug ?? project.uid;
        if (!projectId) return [];

        const grants = await getProjectGrants(projectId, { isAuthorized: false }).catch(() => []);

        return grants
          .map((grant) => grant.uid)
          .filter((grantUid): grantUid is string => Boolean(grantUid))
          .slice(0, PRERENDERED_GRANT_SAMPLE)
          .map((grantUid) => ({ projectId, grantUid }));
      })
    );

    return pairs.flat();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId, grantUid } = await params;
  const [projectInfo, grants] = await Promise.all([
    getProjectCachedData(projectId),
    getProjectGrants(projectId),
  ]);

  if (!projectInfo) {
    return { title: "Project Not Found", description: "Project not found" };
  }

  const grant = grants?.find((g) => g.uid?.toLowerCase() === grantUid?.toLowerCase());

  if (!grant) {
    return generateProjectFundingMetadata(projectInfo, projectId);
  }

  return generateGrantOverviewMetadata(projectInfo, grant, projectId, grantUid);
}

interface LayoutProps {
  children: React.ReactNode;
  params: Params;
}

/**
 * Grant Detail Layout for V2 Profile
 *
 * This layout provides:
 * - Back button to return to funding list
 * - Grant title with edit/delete actions
 * - Tab navigation (Overview, Milestones and Updates, Impact Criteria)
 *
 * Used within the (profile) route group to maintain the main project profile layout
 * while showing grant-specific content.
 */
export default async function Layout({ children, params }: LayoutProps) {
  const { projectId, grantUid } = await params;

  return (
    <GrantDetailLayoutClient projectId={projectId} grantUid={grantUid}>
      {children}
    </GrantDetailLayoutClient>
  );
}
