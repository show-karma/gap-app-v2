import { Skeleton } from "@/components/Utilities/Skeleton";

export default function OnboardingLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Skeleton className="h-8 w-64 rounded" />
      <Skeleton className="mt-2 h-4 w-96 rounded" />
      <div className="mt-8 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: pure skeleton
          <div key={i}>
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="mt-1 h-9 rounded border bg-gray-100" />
          </div>
        ))}
        <Skeleton className="h-10 rounded" />
      </div>
    </main>
  );
}
