import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-10 rounded bg-gray-100" />
        <Skeleton className="h-10 rounded bg-gray-100" />
        <Skeleton className="h-10 rounded bg-gray-100" />
      </div>
    </main>
  );
}
