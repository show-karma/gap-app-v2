import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectTabContentSkeletonProps {
  className?: string;
}

/**
 * Route-neutral fallback for the project profile's page body (DEV-612).
 *
 * The profile layout renders the project's semantic identity — the sr-only
 * <h1>, JSON-LD/breadcrumbs, and the SidebarProfileCardStatic name and
 * description — outside the Suspense boundary, then streams the tab body
 * (activity feed, funding, impact, team) in behind this fallback. It has to
 * work for every tab, so it stays generic rather than mirroring any one tab's
 * shape; the per-tab route-local loading.tsx files still provide the
 * tab-specific skeletons on client navigation.
 *
 * Rendered as <output>, which carries implicit role="status" +
 * aria-live="polite" — the same native-a11y choice ask-karma-chat.tsx makes —
 * so assistive tech reports the pending region instead of silently presenting
 * an empty content area, without a div + hand-rolled ARIA.
 */
export function ProjectTabContentSkeleton({ className }: ProjectTabContentSkeletonProps) {
  return (
    <output
      className={cn("flex w-full flex-col gap-4", className)}
      aria-busy="true"
      aria-label="Loading project content"
      data-testid="project-tab-content-skeleton"
    >
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </output>
  );
}
