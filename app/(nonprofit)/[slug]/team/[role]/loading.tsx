import { Skeleton } from "@/components/Utilities/Skeleton";

export default function TeamMemberLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="mt-3 h-7 w-56 rounded" />
      <Skeleton className="mt-2 h-4 w-80 rounded" />
      <Skeleton className="mt-6 h-9 w-full max-w-md rounded bg-gray-100" />
      <Skeleton className="mt-6 h-64 rounded border bg-gray-100" />
    </main>
  );
}
