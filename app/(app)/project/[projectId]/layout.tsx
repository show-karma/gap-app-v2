/* eslint-disable @next/next/no-img-element */

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { layoutTheme } from "@/src/helper/theme";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
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
 * Only project details are prefetched. Updates and impacts are fetched
 * client-side by tab-specific hooks to keep the initial HTML and hydration
 * payload small on the profile landing route.
 */
async function prefetchCriticalProjectData(
  queryClient: QueryClient,
  projectId: string
): Promise<void> {
  try {
    // Only await project details — needed for SSR shell title + logo
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.PROJECT.DETAILS(projectId),
      queryFn: () => getProjectCachedData(projectId),
    });
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
      <div className={`${layoutTheme.padding} relative flex flex-col`}>
        {/* SSR LCP shell — renders project title in initial HTML before JS loads.
            Rendered as an absolute overlay so hiding/removing it does not reflow the page.
            The ~ sibling selector hides it once the full client layout renders
            (NOT the loading skeleton — the shell stays visible during loading to preserve LCP). */}
        {projectData?.details?.title && (
          <style>{`[data-testid="project-profile-layout"] ~ [data-testid="ssr-project-hero"],
[data-testid="project-not-found"] ~ [data-testid="ssr-project-hero"],
[data-testid="project-profile-layout"] ~ [data-testid="ssr-project-hero-mobile"],
[data-testid="project-not-found"] ~ [data-testid="ssr-project-hero-mobile"]
{ display: none !important }`}</style>
        )}
        {children}
        {projectData?.details?.title && (
          <div
            data-testid="ssr-project-hero"
            className="pointer-events-none absolute left-0 right-0 top-0 z-10 hidden lg:flex flex-col bg-secondary border border-border rounded-xl"
            suppressHydrationWarning
          >
            <div className="relative rounded-xl border-b border-border bg-card p-6 lg:p-8">
              <div className="flex flex-col gap-4">
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
                {projectData.details.description && (
                  <div className="flex flex-col gap-1 flex-1 w-full">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {projectData.details.description.length > 200
                        ? `${projectData.details.description.slice(0, 200)}...`
                        : projectData.details.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {projectData?.details?.title && (
          <div
            data-testid="ssr-project-hero-mobile"
            className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-col rounded-xl border border-border bg-secondary lg:hidden"
            suppressHydrationWarning
          >
            <div className="relative rounded-xl border-b border-border bg-card p-4">
              <div className="flex items-start gap-3">
                {projectData.details.logoUrl && (
                  // biome-ignore lint/performance/noImgElement: SSR shell uses native img for zero-JS LCP
                  <img
                    src={projectData.details.logoUrl}
                    alt={projectData.details.title}
                    className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-md"
                    width={56}
                    height={56}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold leading-tight text-neutral-900 dark:text-white">
                    {projectData.details.title}
                  </h1>
                  {projectData.details.description && (
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {projectData.details.description.length > 120
                        ? `${projectData.details.description.slice(0, 120)}...`
                        : projectData.details.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HydrationBoundary>
  );
}
