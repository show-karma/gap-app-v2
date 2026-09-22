import { Skeleton } from "@/components/Utilities/Skeleton";

const CARD_KEYS = ["n0", "n1", "n2", "n3", "n4", "n5"];

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-3 rounded-2xl border border-border p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
