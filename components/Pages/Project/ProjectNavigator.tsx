"use client";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useStaff } from "@/hooks/useStaff";
import { EnableDonationsButton } from "@/src/features/chain-payout-address";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useProgressModalStore } from "@/store/modals/progress";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ProjectOptionsMenu } from "./ProjectOptionsMenu";

export const ProjectNavigator = ({
  hasContactInfo,
  grantsLength,
}: {
  hasContactInfo: boolean;
  grantsLength: number;
}) => {
  const pathname = usePathname();
  const projectId = useParams().projectId as string;
  const project = useProjectStore((state) => state.project);

  // Memoize publicTabs to prevent recreation on every render
  const publicTabs = useMemo(
    () => [
      {
        name: "Project",
        href: PAGES.PROJECT.OVERVIEW(project?.details?.slug || projectId),
      },
      {
        name: "Updates",
        href: PAGES.PROJECT.UPDATES(project?.details?.slug || projectId),
      },
      {
        name: "Funding",
        href: PAGES.PROJECT.GRANTS(project?.details?.slug || projectId),
      },
      {
        name: "Impact",
        href: PAGES.PROJECT.IMPACT.ROOT(project?.details?.slug || projectId),
      },
      {
        name: "Team",
        href: PAGES.PROJECT.TEAM(project?.details?.slug || projectId),
      },
    ],
    [project?.details?.slug, projectId]
  );

  const [tabs, setTabs] = useState<typeof publicTabs>(publicTabs);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const { isStaff } = useStaff();

  const isAuthorized = isOwner || isProjectAdmin;
  // Can set payout address: project member/owner/admin/staff
  const canSetPayoutAddress =
    isProjectOwner || isOwner || isProjectAdmin || isCommunityAdmin || isStaff;
  useEffect(() => {
    const mountTabs = () => {
      if (isAuthorized) {
        setTabs([
          ...publicTabs,
          {
            name: "Contact Info",
            href: PAGES.PROJECT.CONTACT_INFO(project?.details?.slug || projectId),
          },
        ]);
      } else {
        setTabs(publicTabs);
      }
    };
    mountTabs();
  }, [isAuthorized, project?.details?.slug, projectId, publicTabs]);

  const { setIsProgressModalOpen } = useProgressModalStore();
  return (
    <div className="flex flex-row gap-2 justify-between items-end max-lg:flex-col-reverse max-lg:items-center">
      <nav className="gap-10 flex flex-row max-w-full w-max items-center max-lg:gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 pb-2 text-base flex flex-row gap-2 items-center",
              tab.href.split("/")[3]?.split("?")[0] === pathname.split("/")[3]
                ? "border-blue-600 text-gray-700 font-bold px-0 dark:text-gray-200 max-lg:border-b-2"
                : "border-transparent text-gray-600 px-0 hover:border-gray-300 hover:text-gray-700 dark:text-gray-200 font-normal"
            )}
            prefetch
          >
            {tab.name}
            {tab.name === "Contact Info" && !hasContactInfo ? (
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            ) : null}
            {tab.name === "Funding" && grantsLength ? (
              <p className="rounded-2xl bg-gray-200 px-2.5 py-[2px] text-center text-sm font-medium leading-tight text-slate-700 dark:bg-slate-700 dark:text-zinc-300">
                {formatCurrency(grantsLength || 0)}
              </p>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="flex flex-row gap-2 items-center mb-1">
        {canSetPayoutAddress && (
          <EnableDonationsButton
            projectId={project?.uid || projectId}
            currentAddresses={project?.chainPayoutAddress}
          />
        )}
        {isAuthorized && (
          <Button
            type="button"
            className="w-max bg-brand-blue text-white px-4 py-2 rounded-lg"
            onClick={() => setIsProgressModalOpen(true)}
          >
            Post an update
          </Button>
        )}
        <ProjectOptionsMenu />
      </div>
    </div>
  );
};
