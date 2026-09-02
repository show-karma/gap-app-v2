import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { getExplorerProjectsPaginatedCached } from "@/services/projects-explorer.cached";
import {
  generateGrantOverviewMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { FALLBACK_GRANT_PAIRS, withPrerenderFallback } from "@/utilities/prerender-samples";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { GrantDetailLayoutClient } from "./GrantDetailLayoutClient";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

const PROJECT_LOOKUP_LIMIT = 12;
const PRERENDERED_GRANT_SAMPLE = 2;

/**
 * Real (projectId, grantUid) pairs, prerendered at build.
 *
 * The first version of this sampler took the first project the explorer
 * returned and asked for its grants. That project was `tas-hub`, which has
 * none, so the sampler returned `[]` — and under cacheComponents an empty
 * generateStaticParams fails the build at page-data collection:
 *
 *   error: empty-generate-static-params
 *   failed collecting page data for /project/[projectId]/funding/[grantUid]/complete-grant
 *
 * So it now scans a window of projects and keeps the first that actually has
 * grants, which is also what makes this sample agree with the project layout's:
 * both prefer projects with grants. If the scan finds nothing it uses the
 * checked-in fallback rather than an empty list.
 */
export async function generateStaticParams(): Promise<
  Array<{ projectId: string; grantUid: string }>
> {
  const found: Array<{ projectId: string; grantUid: string }> = [];

  try {
    const { payload } = await getExplorerProjectsPaginatedCached({
      page: 1,
      limit: PROJECT_LOOKUP_LIMIT,
    });

    for (const project of payload) {
      const projectId = project.details?.slug ?? project.uid;
      if (!projectId) continue;

      const grants = await getProjectGrants(projectId, { isAuthorized: false }).catch(() => []);
      const uids = grants
        .map((grant) => grant.uid)
        .filter((grantUid): grantUid is string => Boolean(grantUid))
        .slice(0, PRERENDERED_GRANT_SAMPLE);

      if (uids.length > 0) {
        found.push(...uids.map((grantUid) => ({ projectId, grantUid })));
        break;
      }
    }
  } catch {
    // Fall through to the checked-in pairs.
  }

  return withPrerenderFallback(found, FALLBACK_GRANT_PAIRS);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId, grantUid } = await params;
  const [projectInfo, grants] = await Promise.all([
    getProjectCachedData(projectId),
    // Anonymous: the authorized default reaches TokenManager -> cookies(), which
    // is a request read on a route this PR is trying to prerender.
    getProjectGrants(projectId, { isAuthorized: false }),
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
