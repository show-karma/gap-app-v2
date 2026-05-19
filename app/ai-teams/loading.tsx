import { Skeleton } from "@/components/Utilities/Skeleton";

export default function AITeamListLoading() {
  return (
    <main className="w-full">
      <Skeleton className="h-8 w-48 rounded" />
      <Skeleton className="mt-2 h-4 w-80 rounded" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </main>
  );
}
