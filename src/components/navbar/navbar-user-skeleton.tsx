import { Skeleton } from "@/components/UI/skeleton";
import { cn } from "@/utilities/tailwind";

export function NavbarUserSkeleton() {
  return (
    <div className="hidden lg:flex items-center gap-3">
      <div className="flex flex-row items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-xl" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function NavbarAuthButtonsSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}

export function NavbarLoggedInButtonsSkeleton() {
  return (
    <div className="flex flex-row items-center gap-2">
      <Skeleton className="h-9 w-24 rounded-lg" />
      <Skeleton className="h-9 w-20 rounded-lg" />
      <Skeleton className="h-9 w-20 rounded-lg" />
    </div>
  );
}
