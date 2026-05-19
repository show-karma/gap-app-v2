import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
