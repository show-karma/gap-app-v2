import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <Skeleton className="w-full h-8" />
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-1/2 h-6" />
      <Skeleton className="w-full h-32" />
      <Skeleton className="w-2/3 h-6" />
      <Skeleton className="w-1/3 h-6" />
    </div>
  );
}
