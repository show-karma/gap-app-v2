"use client";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const publicTabs = [
    {
      name: "Project",
      href: PAGES.PROJECT.OVERVIEW(project?.details?.data?.slug || projectId),
    },
    {
      name: "Roadmap",
      href: PAGES.PROJECT.ROADMAP.ROOT(
        project?.details?.data?.slug || projectId
      ),
    },
    {
      name: "Grants",
      href: PAGES.PROJECT.GRANTS(project?.details?.data?.slug || projectId),
    },
    {
      name: "Impact",
      href: PAGES.PROJECT.IMPACT.ROOT(
        project?.details?.data?.slug || projectId
      ),
    },
    {
      name: "Team",
      href: PAGES.PROJECT.TEAM(project?.details?.data?.slug || projectId),
    },
  ];
  const [tabs, setTabs] = useState<typeof publicTabs>(publicTabs);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const isAuthorized = isOwner || isProjectOwner;
  useEffect(() => {
    const mountTabs = () => {
      if (isAuthorized) {
        setTabs([
          ...publicTabs,
          {
            name: "Contact Info",
            href: PAGES.PROJECT.CONTACT_INFO(
              project?.details?.data.slug || projectId
            ),
          },
        ]);
      } else {
        setTabs(publicTabs);
      }
    };
    mountTabs();
  }, [isAuthorized, project]);

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
          >
            {tab.name}
            {tab.name === "Contact Info" && !hasContactInfo ? (
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            ) : null}
            {tab.name === "Grants" && grantsLength ? (
              <p className="rounded-2xl bg-gray-200 px-2.5 py-[2px] text-center text-sm font-medium leading-tight text-slate-700 dark:bg-slate-700 dark:text-zinc-300">
                {formatCurrency(grantsLength || 0)}
              </p>
            ) : null}
          </Link>
        ))}
      </nav>
      {isAuthorized ? (
        <div className="flex flex-row gap-2 items-center mb-1">
          <Button
            type="button"
            className="w-max bg-brand-blue text-white px-4 py-2 rounded-lg"
            onClick={() => setIsProgressModalOpen(true)}
          >
            Post an update
          </Button>
          <ProjectOptionsMenu />
        </div>
      ) : null}
    </div>
  );
};
