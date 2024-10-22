"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { useAccount } from "wagmi";
import formatCurrency from "@/utilities/formatCurrency";
import pluralize from "pluralize";
import Link from "next/link";
import Pagination from "@/components/Utilities/Pagination";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { PAGES } from "@/utilities/pages";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Button } from "@/components/Utilities/Button";
import { useOnboarding } from "@/store/modals/onboarding";
import { useMixpanel } from "@/hooks/useMixpanel";
import { useQuery } from "@tanstack/react-query";
import { LoadingCard } from "./LoadingCard";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
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

const OnboardingButton = () => {
  const { setIsOnboarding } = useOnboarding();
  const { mixpanel } = useMixpanel();
  const { address } = useAccount();

  return (
    <Button
      onClick={() => {
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
      }}
      className="w-max h-max bg-transparent dark:bg-transparent hover:bg-transparent text-black border border-black"
    >
      GAP Platform Walkthrough
    </Button>
  );
};

export default function MyProjects() {
  const { isConnected, address } = useAccount();
  const { isAuth } = useAuthStore();
  const { theme: currentTheme } = useTheme();
  const itemsPerPage = 12;
  const [page, setPage] = useState<number>(1);

  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["totalProjects"],
    queryFn: () => fetchMyProjects(address),
    enabled: Boolean(address),
  });

  const totalProjects: number = projects?.length || 0;
  const myProjects: IProjectResponse[] =
    projects?.slice(itemsPerPage * (page - 1), itemsPerPage * page) || [];

  // do a empty array of 12
  const loadingArray = Array.from({ length: 12 }, (_, index) => index);

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      <div className="mt-5 w-full gap-5">
        {isConnected && isAuth ? (
          <div className="flex flex-col gap-4">
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
                    let total = card.grants?.length || 0;
                    card.grants?.forEach((grant) => {
                      if (grant.completed) return;
                      const hasActive = grant.milestones.find(
                        (milestone: any) =>
                          (milestone.completed && !milestone.approved) ||
                          !milestone.completed
                      );
                      if (hasActive) active += 1;
                    });
                    return (
                      <div
                        key={index}
                        className="h-full bg-white dark:bg-zinc-900 dark:border-gray-900 border border-gray-200 rounded-xl   pb-5 w-full transition-all ease-in-out duration-200"
                      >
                        <Link
                          href={PAGES.PROJECT.OVERVIEW(
                            card.details?.data.slug || card.uid
                          )}
                          className="w-full flex flex-1 flex-col justify-start gap-3"
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
                            <div className="font-body line-clamp-1 mb-0 pb-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                              {card.details?.data.title || card.uid}
                            </div>
                            <div className="font-body dark:text-slate-400 mb-2 text-sm font-medium text-slate-500">
                              {`Created on ${formatDate(card.createdAt)}`}
                            </div>
                          </div>

                          <div className="px-5 flex flex-col gap-1 flex-1 h-full">
                            <div className="line-clamp-2 text-base font-normal ">
                              <MarkdownPreview
                                source={card.details?.data.description || ""}
                                style={{
                                  backgroundColor: "transparent",
                                  color:
                                    currentTheme === "dark"
                                      ? "white"
                                      : "rgb(71, 85, 105)",
                                  width: "100%",
                                  fontSize: "16px",
                                }}
                              />
                            </div>
                          </div>

                          <div className="px-5 flex min-h-[24px] w-full flex-row gap-2">
                            {total ? (
                              <div className="flex h-7 items-center justify-start rounded-2xl bg-slate-50 px-3 py-1">
                                <p className="text-center text-sm font-semibold leading-tight text-slate-600">
                                  {formatCurrency(total)} total{" "}
                                  {pluralize("grants", total)}
                                </p>
                              </div>
                            ) : null}
                            {active ? (
                              <div className="flex h-7 items-center justify-start gap-1.5 rounded-2xl bg-teal-50 py-1 pl-2.5 pr-3">
                                <div className="relative h-2 w-2">
                                  <div className="absolute left-[1px] top-[1px] h-1.5 w-1.5 rounded-full bg-teal-600" />
                                </div>
                                <p className="text-center text-sm font-medium leading-tight text-teal-600">
                                  {formatCurrency(active)} active{" "}
                                  {pluralize("grants", active)}
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
              <div className="flex w-full flex-row items-center justify-center">
                <div
                  className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 bg-[#EEF4FF] px-8 max-sm:px-1"
                  style={{
                    border: "dashed 2px #155EEF",
                  }}
                >
                  <p className="text-lg font-bold text-black">Attention!</p>
                  <p className="w-max max-w-md break-normal max-sm:break-keep max-sm:whitespace-break-spaces text-left text-lg max-sm:max-w-full max-sm:text-center max-sm:text-base max-sm:w-full font-normal text-black">
                    We were unable to locate any projects associated with your
                    wallet address: {address}. <br />
                    To find your project, please use the search function above.
                    If your project isn&apos;t listed, feel free to create a new
                    one.
                  </p>
                  <ProjectDialog />
                </div>
              </div>
            )}

            <div className="flex mt-20 justify-center items-center w-full">
              <OnboardingButton />
            </div>
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
