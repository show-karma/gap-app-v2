import { Skeleton } from "@/components/Utilities/Skeleton";

// `/community` immediately redirects to `/communities`, so this is only ever shown for the
// brief moment before the redirect resolves.
export default function Loading() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-4 h-4 w-full" />
    </div>
  );
}
