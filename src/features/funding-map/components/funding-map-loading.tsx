import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FundingMapCardSkeleton } from "./funding-map-card-skeleton";

function SearchSkeleton() {
  return (
    <section className="flex w-full justify-center my-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Skeleton className="h-10 w-96 max-w-full" />

          <div className="relative w-full">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <FiltersSkeleton />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <FundingMapCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="flex w-full flex-col gap-6 rounded-2xl bg-secondary p-4 lg:w-80 lg:shrink-0">
      {/* Newsletter & Submit Program Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 rounded-xl p-5">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="px-5">
          <div className="h-px w-full" />
        </div>

        <div className="flex flex-col gap-5 rounded-xl p-5">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Featured Round Card */}
      <Card className="flex flex-col gap-8 border-border p-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-7 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </Card>

      {/* Create Profile Card */}
      <div className="flex flex-col gap-5 rounded-xl p-5">
        <Skeleton className="h-6 w-6" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
    </aside>
  );
}

function PaginationSkeleton() {
  return (
    <div className="flex w-full items-center justify-between py-12 max-md:flex-col-reverse max-md:gap-4">
      <Skeleton className="h-5 w-48" />

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function FundingMapLoading() {
  return (
    <main className="flex w-full flex-col">
      <SearchSkeleton />
      <div className="flex w-full flex-col gap-6 px-6 py-16 lg:px-8">
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col gap-6 lg:flex-row">
            <ListSkeleton />
            <SidebarSkeleton />
          </div>
          <PaginationSkeleton />
        </div>
      </div>
    </main>
  );
}
