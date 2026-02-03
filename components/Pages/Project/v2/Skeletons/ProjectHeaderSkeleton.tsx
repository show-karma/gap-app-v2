import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectHeaderSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading state for ProjectHeader.
 * Matches the layout structure of the actual component.
 */
export function ProjectHeaderSkeleton({ className }: ProjectHeaderSkeletonProps) {
  return (
    <div className={cn("w-full", className)} data-testid="project-header-skeleton">
      <div className="relative rounded-xl border border-border border-t-0 border-l-0 border-r-0 bg-card p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Left side: Project Info */}
          <div className="flex flex-col gap-4 lg:flex-1 lg:basis-1/2 lg:min-w-0 w-full">
            {/* Top row: Profile pic, name, and social links */}
            <div className="flex flex-row items-center gap-4 w-full flex-wrap max-sm:flex-col">
              <div className="flex flex-row items-center justify-between flex-1 min-w-0 flex-wrap gap-4">
                {/* Profile Picture - Desktop */}
                <Skeleton className="hidden lg:block h-[82px] w-[82px] min-w-[82px] min-h-[82px] rounded-full" />
                {/* Profile Picture - Mobile */}
                <Skeleton className="lg:hidden h-16 w-16 min-w-16 min-h-16 rounded-full" />

                {/* Name with badge and social links */}
                <div className="flex flex-row items-center justify-between flex-1 min-w-0 flex-wrap">
                  <div className="flex flex-row items-center gap-2 flex-wrap">
                    <Skeleton className="h-8 w-48 lg:w-64" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  {/* Social links - Desktop */}
                  <div className="hidden lg:flex flex-row items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </div>
              {/* Social links - Mobile */}
              <div className="lg:hidden flex flex-row items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2 flex-1 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Stage indicator */}
            <div className="flex flex-row items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>

          {/* Vertical Divider - Desktop only */}
          <div className="hidden lg:block w-px bg-border self-stretch -my-8" />

          {/* Right side: Project Activity Chart */}
          <div className="mt-6 lg:mt-0 lg:flex-1 lg:basis-1/2">
            <div className="flex flex-col h-full">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-[120px] w-full rounded-lg" />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
