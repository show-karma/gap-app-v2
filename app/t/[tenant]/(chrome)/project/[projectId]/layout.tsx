// `export const revalidate = 60` lived here — 60s CDN ISR for every project
// page — until cacheComponents rejected the segment config. The caching now
// sits on the loaders this layout and its pages read, as `"use cache"` +
// `cacheLife("minutes")` (revalidate 60, the same ceiling) tagged per project:
// see `services/project.cached.ts`. The React Query seed below is cached the
// same way, because dehydrate() stamps entries with `Date.now()`.

import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { ProjectShareDialogMount } from "@/components/Pages/Project/ProjectShareDialogMount";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { ProjectJsonLd } from "@/components/Seo/ProjectJsonLd";
import { E2EStoreExposer } from "@/components/Utilities/E2EStoreExposer";
import { getProjectSeedCached } from "@/services/project.cached";
import { getExplorerProjectsPaginatedCached } from "@/services/projects-explorer.cached";
import { layoutTheme } from "@/src/helper/theme";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { PAGES } from "@/utilities/pages";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { reportCanonicalMismatchIfAny } from "@/utilities/sentry/reportCanonicalMismatch";

type Params = Promise<{
  projectId: string;
}>;

const PRERENDERED_PROJECT_SAMPLE = 3;

/**
 * A small sample of real projects, prerendered at build.
 *
 * With `generateStaticParams` present the layout may keep its top-level
 * `await params`: the sample values are known at build time, and any other
 * project renders on first request and is then persisted.
 *
 * The slugs are read from the explorer rather than hard-coded, so they are
 * real on whichever environment is building instead of a list that silently
 * rots when a project is renamed. A failure here degrades to prerendering no
 * projects — never to a failed build, and never to a fabricated slug.
 */
export async function generateStaticParams(): Promise<Array<{ projectId: string }>> {
  try {
    const { payload } = await getExplorerProjectsPaginatedCached({
      page: 1,
      limit: PRERENDERED_PROJECT_SAMPLE,
    });

    return payload
      .map((project) => project.details?.slug ?? project.uid)
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, PRERENDERED_PROJECT_SAMPLE)
      .map((projectId) => ({ projectId }));
  } catch {
    return [];
  }
}

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

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const awaitedParams = await props.params;
  const { projectId } = awaitedParams;

  const { children } = props;

  // Prefetch the project record and the default Updates feed.
  // Failures are logged but don't break the page - client hooks will fetch as fallback
  // Skip prefetch during E2E tests — the staging API may be behind Cloudflare,
  // and a server-side prefetch failure gets cached by React Query, preventing
  // client-side refetch (which Cypress CAN intercept).
  // The seed is built inside `"use cache"` — React Query stamps its entries
  // with `Date.now()`, which cacheComponents rejects during prerender.
  const isE2E = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";
  const dehydratedState = isE2E ? undefined : await getProjectSeedCached(projectId);

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
    } catch (error) {
      // Re-throw Next control-flow errors (notFound()/redirect()) so a bare
      // catch can't swallow them; only a transient fetch failure falls through.
      unstable_rethrow(error);
      // SUPPRESSED: transient project fetch failure — client hooks refetch.
    }
  }
  const canonicalSlug = projectInfo?.details?.slug || projectId;

  return (
    <HydrationBoundary state={dehydratedState}>
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
