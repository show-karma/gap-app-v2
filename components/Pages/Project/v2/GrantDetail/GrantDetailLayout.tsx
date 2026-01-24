"use client";

import { ArrowLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { GrantCompleteButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton";
import { GrantContext } from "@/components/Pages/GrantMilestonesAndUpdates/GrantContext";
import { GrantDelete } from "@/components/Pages/GrantMilestonesAndUpdates/GrantDelete";
import { GrantLinkExternalAddressButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantLinkExternalAddressButton";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProject } from "@/hooks/useProject";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface GrantDetailLayoutProps {
  children: React.ReactNode;
}

type GrantTab = "overview" | "milestones-and-updates" | "impact-criteria";

const tabs: { name: string; tabName: GrantTab }[] = [
  { name: "Overview", tabName: "overview" },
  { name: "Milestones and Updates", tabName: "milestones-and-updates" },
  { name: "Impact Criteria", tabName: "impact-criteria" },
];

function getActiveTab(pathname: string): GrantTab {
  if (pathname.endsWith("/milestones-and-updates")) return "milestones-and-updates";
  if (pathname.endsWith("/impact-criteria")) return "impact-criteria";
  return "overview";
}

export function GrantDetailLayout({ children }: GrantDetailLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useAccount();

  const projectIdFromUrl = params.projectId as string;
  const grantUid = params.grantUid as string;

  const { grant, setGrant, loading, setLoading } = useGrantStore();
  const { project: storedProject } = useProjectStore();
  const { isProjectAdmin } = useProjectPermissions();
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const setIsCommunityAdmin = useCommunityAdminStore((state) => state.setIsCommunityAdmin);
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  // Check admin status
  useIsCommunityAdmin(grant?.community?.uid || grant?.data?.communityUID, address, {
    zustandSync: { setIsCommunityAdmin },
  });

  // Fetch project if not in store
  const { project: fetchedProject, isLoading: isLoadingProject } = useProject(projectIdFromUrl);
  const project = storedProject || fetchedProject;

  // Fetch grants
  const { grants, isLoading: isLoadingGrants } = useProjectGrants(
    project?.uid || projectIdFromUrl || ""
  );

  // Set grant when URL changes
  useEffect(() => {
    if (!project || isLoadingGrants) return;

    if (grants.length === 0) {
      setGrant(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (grantUid) {
      const grantFound = grants.find((g) => g.uid?.toLowerCase() === grantUid?.toLowerCase());
      if (grantFound) {
        setGrant(grantFound);
        setLoading(false);
        return;
      }
    }

    setGrant(grants[0]);
    setLoading(false);
  }, [project, grants, isLoadingGrants, grantUid, setGrant, setLoading]);

  const activeTab = getActiveTab(pathname);
  const fundingPath = `/project/${projectIdFromUrl}/funding`;

  // Loading state
  if (!project || isLoadingProject || isLoadingGrants || loading || (!grant && grants.length > 0)) {
    return (
      <div className="flex flex-col gap-4" data-testid="grant-detail-loading">
        <div className="animate-pulse h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-12 w-full bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-64 w-full bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  // No grants found
  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12" data-testid="no-grant">
        <p className="text-gray-500 dark:text-gray-400">Grant not found</p>
        <Link
          href={fundingPath}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Funding
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="grant-detail-layout">
      {/* Back Button */}
      <Link
        href={fundingPath}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-fit"
        data-testid="back-to-funding"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Funding
      </Link>

      {/* Grant Title and Actions */}
      <div className="flex flex-row gap-4 justify-between max-md:flex-col border-b border-gray-200 dark:border-zinc-700 pb-4">
        <div className="flex flex-row gap-2 items-center">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-100">
            {grant?.details?.title}
          </h2>
          {isAuthorized && grant && project ? (
            <Link
              href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                project.details?.slug || project?.uid || "",
                grant?.uid as string,
                "edit"
              )}
              className="rounded-md items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-35 hover:opacity-75 transition-all ease-in-out duration-300 flex h-max w-max flex-row gap-2 text-zinc-800 p-2 dark:text-zinc-100"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </Link>
          ) : null}
        </div>
        {isAuthorized && grant && project ? (
          <div className="flex flex-row gap-2 items-center">
            <GrantLinkExternalAddressButton grant={grant as any} />
            <GrantCompleteButton project={project} grant={grant} />
            <GrantDelete grant={grant} />
          </div>
        ) : null}
      </div>

      {/* Tab Navigation */}
      <nav
        className="isolate flex flex-row max-lg:w-full flex-wrap gap-4 divide-x divide-gray-200 rounded-lg py-1 px-1 bg-[#F2F4F7] dark:bg-zinc-900 w-max transition-all duration-300 ease-in-out"
        aria-label="Grant Tabs"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.tabName}
            href={
              tab.tabName === "overview"
                ? `/project/${projectIdFromUrl}/funding/${grantUid}`
                : `/project/${projectIdFromUrl}/funding/${grantUid}/${tab.tabName}`
            }
            className={cn(
              activeTab === tab.tabName
                ? "text-gray-900 bg-white dark:bg-zinc-700 dark:text-zinc-100"
                : "text-gray-500 hover:text-gray-700 dark:text-zinc-400",
              "group relative min-w-0 w-max border-none overflow-hidden rounded-lg py-2 px-3 text-center text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 dark:hover:text-white focus:z-10 transition-all duration-300 ease-in-out"
            )}
            data-testid={`tab-${tab.tabName}`}
          >
            {tab.name}
          </Link>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="flex flex-col py-2" data-testid="grant-detail-content">
        <GrantContext.Provider value={grant}>{children}</GrantContext.Provider>
      </div>
    </div>
  );
}
