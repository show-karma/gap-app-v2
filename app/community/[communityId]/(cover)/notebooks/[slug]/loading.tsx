import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-2xl" />
    </div>
  );
}
