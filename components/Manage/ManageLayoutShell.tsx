"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { Link } from "@/src/components/navigation/Link";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useOwnerStore } from "@/store/owner";
import { PAGES } from "@/utilities/pages";
import { ManageBreadcrumbs } from "./ManageBreadcrumbs";
import { ManageSidebar } from "./ManageSidebar";

export function ManageLayoutShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const communityId = params.communityId as string;
  const { data: community, isLoading, isError } = useCommunityDetails(communityId);
  const {
    isCommunityAdmin,
    isProgramAdmin,
    isReviewer,
    isRegistryAdmin,
    isLoading: permissionsLoading,
  } = usePermissionContext();
  const { isOwner, isOwnerLoading } = useOwnerStore();

  // Expose Zustand store setters for E2E tests when running under Cypress
  useEffect(() => {
    if (typeof window !== "undefined" && (window as Window & { Cypress?: unknown }).Cypress) {
      (window as Window & { __E2E_STORES__?: Record<string, unknown> }).__E2E_STORES__ = {
        ...((window as Window & { __E2E_STORES__?: Record<string, unknown> }).__E2E_STORES__ || {}),
        setIsOwner: useOwnerStore.getState().setIsOwner,
        setIsOwnerLoading: useOwnerStore.getState().setIsOwnerLoading,
      };
    }
  }, []);

  const hasManageAccess =
    isCommunityAdmin || isProgramAdmin || isReviewer || isRegistryAdmin || isOwner;

  if (isLoading || permissionsLoading || isOwnerLoading) {
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

  if (isError) {
    return (
      <div className="flex w-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">Failed to load community data</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasManageAccess) {
    return (
      <div className="flex w-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You don&apos;t have permission to access this area.
          </p>
          <Link
            href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Go to Community
          </Link>
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
