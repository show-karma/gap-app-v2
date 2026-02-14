"use client";

import { useParams } from "next/navigation";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { ManageBreadcrumbs } from "./ManageBreadcrumbs";
import { ManageSidebar } from "./ManageSidebar";

export function ManageLayoutShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const communityId = params.communityId as string;
  const { data: community, isLoading } = useCommunityDetails(communityId);

  if (isLoading) {
    return (
      <div className="flex w-full min-h-[60vh]">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-60 xl:w-64 flex-shrink-0 border-r border-gray-200 dark:border-zinc-700 p-4">
          <Skeleton className="h-12 w-full rounded-lg mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 rounded-lg mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return <div className="p-6">{children}</div>;
  }

  const slug = community.details?.slug || communityId;

  return (
    <div className="flex w-full min-h-[60vh]">
      <ManageSidebar communityId={communityId} community={community} />
      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <ManageBreadcrumbs communitySlug={slug} />
        {children}
      </main>
    </div>
  );
}
