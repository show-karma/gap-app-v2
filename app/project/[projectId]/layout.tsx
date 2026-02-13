/* eslint-disable @next/next/no-img-element */

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { layoutTheme } from "@/src/helper/theme";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { prefetchProjectProfileData } from "@/utilities/queries/prefetchProjectProfile";
import { QUERY_KEYS } from "@/utilities/queryKeys";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const awaitedParams = await params;
  const { projectId } = awaitedParams;

  const projectInfo = await getProjectCachedData(projectId);

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
  await safePrefetchProjectData(queryClient, projectId);

  // Use cached project data for SSR LCP shell (already fetched by generateMetadata / prefetch)
  const projectData = queryClient.getQueryData<Awaited<ReturnType<typeof getProjectCachedData>>>(
    QUERY_KEYS.PROJECT.DETAILS(projectId)
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className={`${layoutTheme.padding} flex flex-col`}>
        {/* SSR LCP shell — renders project title in initial HTML before JS loads.
            Uses CSS order:-1 so it appears above children visually, while being after
            children in DOM order. The ~ sibling selector hides it once React renders
            any client layout (loading skeleton, error, or full layout).
            Also removed from DOM by ProjectProfileLayout's useEffect as cleanup. */}
        {projectData?.details?.title && (
          <style>{`[data-testid="project-profile-layout"] ~ [data-testid="ssr-project-hero"],
[data-testid="layout-loading"] ~ [data-testid="ssr-project-hero"],
[data-testid="project-not-found"] ~ [data-testid="ssr-project-hero"]
{ display: none !important }`}</style>
        )}
        {children}
        {projectData?.details?.title && (
          <div
            data-testid="ssr-project-hero"
            className="hidden lg:flex flex-col bg-secondary border border-border rounded-xl order-[-1]"
            suppressHydrationWarning
          >
            <div className="relative rounded-xl border-b border-border bg-card p-6 lg:p-8">
              <div className="flex flex-row items-center gap-4">
                {projectData.details.logoUrl && (
                  // biome-ignore lint/performance/noImgElement: SSR shell uses native img for zero-JS LCP
                  <img
                    src={projectData.details.logoUrl}
                    alt={projectData.details.title}
                    className="h-16 w-16 lg:h-[82px] lg:w-[82px] rounded-full border-2 border-white shadow-lg object-cover"
                    width={82}
                    height={82}
                  />
                )}
                <h1 className="text-xl font-bold leading-tight lg:text-2xl text-neutral-900 dark:text-white tracking-tight">
                  {projectData.details.title}
                </h1>
              </div>
            </div>
          </div>
        )}
      </div>
    </HydrationBoundary>
  );
}
