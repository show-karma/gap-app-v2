"use client";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import pluralize from "pluralize";
import { useState } from "react";
import { useAccount } from "wagmi";
/* eslint-disable @next/next/no-img-element */
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import Pagination from "@/components/Utilities/Pagination";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useAuth } from "@/hooks/useAuth";
import { useMixpanel } from "@/hooks/useMixpanel";
import { layoutTheme } from "@/src/helper/theme";
import { useOnboarding } from "@/store/modals/onboarding";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";
import { EmptyProjectsState } from "./EmptyProjectsState";
import { LoadingCard } from "./LoadingCard";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

const pickColor = (index: number) => {
  const cardColors = [
    "#5FE9D0",
    "#875BF7",
    "#F97066",
    "#FDB022",
    "#A6EF67",
    "#84ADFF",
    "#EF6820",
    "#EE46BC",
    "#EEAAFD",
    "#67E3F9",
  ];
  return cardColors[index % cardColors.length];
};

export default function MyProjects() {
  const { isConnected, address } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const { theme: currentTheme } = useTheme();
  const { setIsOnboarding } = useOnboarding();
  const { mixpanel } = useMixpanel();
  const itemsPerPage = 12;
  const [page, setPage] = useState<number>(1);

  const handleStartWalkthrough = () => {
    setIsOnboarding(true);
    if (address) {
      mixpanel.reportEvent({
        event: "onboarding:popup",
        properties: { address },
      });
      mixpanel.reportEvent({
        event: "onboarding:navigation",
        properties: { address, id: "welcome" },
      });
    }
  };

  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["totalProjects", address],
    queryFn: () => fetchMyProjects(address as `0x${string}` | undefined),
    enabled: Boolean(address),
  });

  const totalProjects: number = projects?.length || 0;
  const myProjects = (projects?.slice(itemsPerPage * (page - 1), itemsPerPage * page) ||
    []) as ProjectWithGrantsResponse[];

  // do a empty array of 12
  const loadingArray = Array.from({ length: 12 }, (_, index) => index);

  return (
    <div className={layoutTheme.padding}>
      <div className="mt-5 w-full gap-5">
        {isConnected && isAuth ? (
          <div className="flex flex-col gap-4">
            {/* Show header only when loading or when there are projects */}
            {(isLoading || myProjects.length > 0) && (
              <div className="flex flex-row items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Projects</h1>
                <ProjectDialog
                  buttonElement={{
                    text: "Create Project",
                    styleClass:
                      "flex rounded-md hover:opacity-75 border-none transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-2 bg-brand-darkblue dark:bg-gray-700 px-5 py-2.5 text-base font-semibold text-white hover:bg-brand-darkblue",
                  }}
                />
              </div>
            )}
            {isLoading ? (
              <div className="flex flex-col gap-4 justify-start">
                <div className="grid grid-cols-4 gap-7 pb-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  {loadingArray.map((item) => (
                    <LoadingCard key={item} />
                  ))}
                </div>
              </div>
            ) : myProjects.length > 0 ? (
              <div className="flex flex-col gap-4 justify-start">
                <div className="grid grid-cols-4 gap-7 pb-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  {myProjects.map((card, index) => {
                    let active = 0;
                    const total = card.grants?.length || 0;
                    card.grants?.forEach((grant) => {
                      if (grant.completed) return;
                      const hasActive = grant.milestones?.find(
                        (milestone: any) => !milestone.completed
                      );
                      if (hasActive) active += 1;
                    });
                    return (
                      <div
                        key={index}
                        className="h-full dark:border-gray-900 border border-gray-200 rounded-xl pb-5 w-full transition-all ease-in-out duration-200"
                      >
                        <Link
                          href={PAGES.PROJECT.OVERVIEW(card.details?.slug || card.uid)}
                          className="w-full flex flex-1 flex-col justify-between gap-3"
                        >
                          <div className="px-2 w-full mt-2.5">
                            <div
                              className=" h-[4px] w-full rounded-full"
                              style={{
                                background: pickColor(index),
                              }}
                            />
                          </div>

                          <div className="px-5 flex flex-col gap-0">
                            <div className="flex flex-row items-center gap-2 mb-1">
                              <div className="flex justify-center">
                                <ProfilePicture
                                  imageURL={card.details?.logoUrl}
                                  name={card.uid || ""}
                                  size="32"
                                  className="h-8 w-8 min-w-8 min-h-8 border border-white shadow-sm"
                                  alt={card.details?.title || "Project"}
                                />
                              </div>
                              <div className="font-body line-clamp-1 mb-0 pb-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
                                {card.details?.title || card.uid}
                              </div>
                            </div>
                            <div className="font-body dark:text-slate-400 mb-2 text-sm font-medium text-slate-500">
                              {`Created on ${formatDate(card.createdAt)}`}
                            </div>
                          </div>

                          <div className="px-5 flex flex-col gap-1 flex-1 h-full">
                            <div className="line-clamp-2 text-base font-normal ">
                              <MarkdownPreview
                                source={card.details?.description || ""}
                                style={{
                                  backgroundColor: "transparent",
                                  color: currentTheme === "dark" ? "white" : "rgb(71, 85, 105)",
                                  width: "100%",
                                  fontSize: "16px",
                                }}
                                components={{
                                  a: ({ children, href }) => <span>{children}</span>,
                                }}
                              />
                            </div>
                          </div>

                          <div className="px-5 flex min-h-[24px] w-full flex-row gap-2 mt-4">
                            {total ? (
                              <div className="flex h-7 items-center justify-start rounded-2xl bg-slate-50 px-3 py-1">
                                <p className="text-center text-sm font-semibold leading-tight text-slate-600">
                                  {formatCurrency(total)} total {pluralize("grants", total)}
                                </p>
                              </div>
                            ) : null}
                            {active ? (
                              <div className="flex h-7 items-center justify-start gap-1.5 rounded-2xl bg-teal-50 py-1 pl-2.5 pr-3">
                                <div className="relative h-2 w-2">
                                  <div className="absolute left-[1px] top-[1px] h-1.5 w-1.5 rounded-full bg-teal-600" />
                                </div>
                                <p className="text-center text-sm font-medium leading-tight text-teal-600">
                                  {formatCurrency(active)} active {pluralize("grants", active)}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                {totalProjects && totalProjects > itemsPerPage ? (
                  <Pagination
                    currentPage={page}
                    postsPerPage={itemsPerPage}
                    totalPosts={totalProjects}
                    setCurrentPage={(newPage) => {
                      setPage(newPage);
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <EmptyProjectsState onStartWalkthrough={handleStartWalkthrough} />
            )}
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <p className="text-base font-normal text-black dark:text-white">
              {MESSAGES.MY_PROJECTS.NOT_CONNECTED}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
