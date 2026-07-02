/** ISR: revalidate project pages every 60 seconds for CDN caching */
export const revalidate = 60;

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { ProjectShareDialogMount } from "@/components/Pages/Project/ProjectShareDialogMount";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { ProjectJsonLd } from "@/components/Seo/ProjectJsonLd";
import { E2EStoreExposer } from "@/components/Utilities/E2EStoreExposer";
import { layoutTheme } from "@/src/helper/theme";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { PAGES } from "@/utilities/pages";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { prefetchProjectProfileData } from "@/utilities/queries/prefetchProjectProfile";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { reportCanonicalMismatchIfAny } from "@/utilities/sentry/reportCanonicalMismatch";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  // Skip server-side API calls during E2E tests — the staging API may be
  // unreachable from CI, causing generateMetadata to hang and block the
  // entire page from loading (120s timeout).
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Project" };
  }

  const awaitedParams = await params;
  const { projectId } = awaitedParams;

  const projectInfo = await getProjectCachedData(projectId);

  // Tripwire: getProjectCachedData redirects to the canonical slug, so a
  // resolved slug that differs from the requested id here signals the
  // cross-request render bleed rather than normal routing.
  reportCanonicalMismatchIfAny({
    scope: "project",
    requestedId: projectId,
    resolvedSlug: projectInfo?.details?.slug,
    resolvedUid: projectInfo?.uid,
  });

  return generateProjectOverviewMetadata(projectInfo, projectId);
}

/**
 * Safely prefetch all project data with error handling.
 * Uses Promise.allSettled to ensure failures don't break the page.
 * Client-side hooks will fetch missing data as a fallback.
 */
async function safePrefetchProjectData(queryClient: QueryClient, projectId: string): Promise<void> {
  try {
    const results = await Promise.allSettled([
      // Core project data
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.PROJECT.DETAILS(projectId),
        queryFn: () => getProjectCachedData(projectId),
      }),
      // Related data (grants, updates, impacts)
      prefetchProjectProfileData(queryClient, projectId),
    ]);

    // Log failures in development for debugging
    if (process.env.NODE_ENV === "development") {
      const [projectResult, relatedResult] = results;
      if (projectResult.status === "rejected") {
        console.warn(
          `[ProjectLayout] Failed to prefetch project details for ${projectId}:`,
          projectResult.reason
        );
      }
      if (relatedResult.status === "rejected") {
        console.warn(
          `[ProjectLayout] Failed to prefetch related data for ${projectId}:`,
          relatedResult.reason
        );
      }
    }
  } catch (error) {
    // Catch any unexpected errors to prevent page from breaking
    if (process.env.NODE_ENV === "development") {
      console.error(`[ProjectLayout] Unexpected error during prefetch for ${projectId}:`, error);
    }
    // Continue without prefetched data - client-side hooks will fetch as fallback
  }
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const awaitedParams = await props.params;
  const { projectId } = awaitedParams;

  const { children } = props;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: defaultQueryOptions,
    },
  });

  // Prefetch all critical data in parallel with error handling
  // Failures are logged but don't break the page - client hooks will fetch as fallback
  // Skip prefetch during E2E tests — the staging API may be behind Cloudflare,
  // and a server-side prefetch failure gets cached by React Query, preventing
  // client-side refetch (which Cypress CAN intercept).
  const isE2E = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";
  if (!isE2E) {
    await safePrefetchProjectData(queryClient, projectId);
  }

  // Structured data for crawlers. `getProjectCachedData` is memoized (react
  // `cache`) and already resolved during `generateMetadata`, so this reuses the
  // same result with no extra request. Skipped under E2E for the same reason as
  // the prefetch above. Wrapped defensively: notFound()/redirect() are already
  // enforced by generateMetadata, so a throw here is a transient fetch error —
  // render the shell rather than failing the whole page.
  let projectInfo: Awaited<ReturnType<typeof getProjectCachedData>> | null = null;
  if (!isE2E) {
    try {
      projectInfo = await getProjectCachedData(projectId);
    } catch {
      // SUPPRESSED: transient project fetch failure — client hooks refetch.
    }
  }
  const canonicalSlug = projectInfo?.details?.slug || projectId;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {projectInfo?.details?.title ? (
        <>
          <ProjectJsonLd project={projectInfo} slug={canonicalSlug} />
          <BreadcrumbJsonLd
            items={[
              { name: "Home", url: PAGES.HOME },
              { name: "Projects", url: PAGES.PROJECTS_EXPLORER },
              { name: projectInfo.details.title, url: PAGES.PROJECT.OVERVIEW(canonicalSlug) },
            ]}
          />
        </>
      ) : null}
      <E2EStoreExposer />
      <ProjectShareDialogMount />
      <div className={layoutTheme.padding}>
        {/*
          Server-render exactly one <h1> per project page for SEO. The visible
          project title lives in the sidebar profile card as an <h2>, and that
          card renders twice (mobile + desktop, toggled by CSS) — promoting it
          to <h1> would emit two h1s. A single screen-reader-only <h1> at this
          shared layout level is the one authoritative, viewport-independent
          page heading crawlers see, and it covers every project sub-route.
        */}
        {projectInfo?.details?.title ? (
          <h1 className="sr-only">{projectInfo.details.title}</h1>
        ) : null}
        {children}
      </div>
    </HydrationBoundary>
  );
}
