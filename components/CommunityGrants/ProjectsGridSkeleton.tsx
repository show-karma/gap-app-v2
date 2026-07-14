import { Skeleton } from "@/components/Utilities/Skeleton";

interface ProjectsGridSkeletonProps {
  count?: number;
}

function ProjectBlockSkeleton() {
  return (
    <div
      data-testid="project-block-skeleton"
      aria-hidden
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid min-h-36 grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[152px_minmax(0,1fr)]">
        <Skeleton className="aspect-square h-full w-full self-start rounded-none" />

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="mb-2 flex flex-col gap-1.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsGridSkeleton({ count = 8 }: ProjectsGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => `project-block-skeleton-${index}`);

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((id) => (
        <ProjectBlockSkeleton key={id} />
      ))}
    </div>
  );
}
