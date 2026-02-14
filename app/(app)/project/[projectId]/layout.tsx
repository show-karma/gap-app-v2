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
 * Prefetch project data for SSR hydration.
 *
 * Only project details are awaited (needed for the SSR shell title + logo).
 * Secondary data (grants, updates, impacts) is fired in parallel but NOT
 * awaited — this unblocks TTFB so the server can start streaming HTML as
 * soon as the critical project details resolve.
 *
 * Client-side hooks will either get a cache hit (if the secondary prefetch
 * finished before dehydrate) or fetch the data themselves with loading states.
 */
async function prefetchCriticalProjectData(
  queryClient: QueryClient,
  projectId: string
): Promise<void> {
  try {
    // Start secondary prefetches immediately (non-blocking)
    const secondaryPromise = prefetchProjectProfileData(queryClient, projectId);

    // Only await project details — needed for SSR shell title + logo
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.PROJECT.DETAILS(projectId),
      queryFn: () => getProjectCachedData(projectId),
    });

    // Brief grace period: secondary data started in parallel, so it may
    // already be done. Wait up to 150ms to include it in dehydrated state.
    await Promise.race([secondaryPromise, new Promise((resolve) => setTimeout(resolve, 150))]);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[ProjectLayout] Failed to prefetch data for ${projectId}:`, error);
    }
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

  // Await only project details (needed for SSR shell); secondary data prefetches in background
  await prefetchCriticalProjectData(queryClient, projectId);

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
