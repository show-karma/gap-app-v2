import { Skeleton } from "@/components/ui/skeleton";

export const ProjectGrantsImpactLoading = () => {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
};
