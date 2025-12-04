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
import { SingleProjectDonateModal } from "@/components/Donation/SingleProject/SingleProjectDonateModal";
import type { Hex } from "viem";
import Image from "next/image";

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
      name: "Updates",
      href: PAGES.PROJECT.UPDATES(project?.details?.data?.slug || projectId),
    },
    {
      name: "Funding",
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
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);

  const isAuthorized = isOwner || isProjectAdmin;
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
        {isAuthorized && (
          <Button
            type="button"
            className="w-max bg-brand-blue text-white px-4 py-2 rounded-lg"
            onClick={() => setIsProgressModalOpen(true)}
          >
            Post an update
          </Button>
        )}
        {project?.payoutAddress && (
          <button
            type="button"
            onClick={() => setIsDonateModalOpen(true)}
            className="group relative bg-brand-blue hover:bg-blue-600 text-white justify-center items-center flex flex-row gap-2 py-2.5 px-5 rounded-full w-max min-w-max transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] font-semibold text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>Support Project</span>
          </button>
        )}
        <ProjectOptionsMenu />
      </div>
      {project?.details && project?.payoutAddress && (
        <SingleProjectDonateModal
          isOpen={isDonateModalOpen}
          onClose={() => setIsDonateModalOpen(false)}
          project={{
            uid: project.uid,
            title: project.details.data.title || "",
            payoutAddress: project.payoutAddress as Hex,
            imageURL: project.details?.data.imageURL,
            chainID: project.chainID,
          }}
        />
      )}
    </div>
  );
};
