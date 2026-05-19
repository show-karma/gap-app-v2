import { Skeleton } from "@/components/Utilities/Skeleton";

export default function TeamLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Skeleton className="h-8 w-64 rounded" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: pure skeleton
          <Skeleton key={i} className="h-32 rounded border bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
