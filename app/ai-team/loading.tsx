import { Skeleton } from "@/components/Utilities/Skeleton";

export default function AITeamListLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Skeleton className="h-8 w-48 rounded" />
      <Skeleton className="mt-2 h-4 w-80 rounded" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </main>
  );
}
