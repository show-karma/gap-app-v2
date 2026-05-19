import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Skeleton className="h-8 w-64 rounded" />
      <Skeleton className="mt-3 h-4 w-96 rounded bg-gray-100" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40 rounded border bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
