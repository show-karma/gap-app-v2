"use client";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import markdownStyles from "@/styles/markdown.module.css";
import { PAGES } from "@/utilities/pages";
import { Hex } from "viem";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useGrantStore } from "@/store/grant";
import { Suspense } from "react";
import { ProjectGrantsOverviewLoading } from "../Loading/Grants/Overview";
import formatCurrency from "@/utilities/formatCurrency";

const isValidAmount = (amount?: string | undefined) => {
  if (!amount) return undefined;

  const number = Number(amount);
  if (Number.isNaN(number)) return amount;

  return formatCurrency(+amount);
};
export const GrantOverview = () => {
  const { grant, loading } = useGrantStore();
  if (loading) {
    return <ProjectGrantsOverviewLoading />;
  }
  const milestones = grant?.milestones;

  const getPercentage = () => {
    if (!milestones) return 0;

    const total = milestones.length;
    const completed = milestones.filter(
      (milestone) => milestone.completed
    ).length;

    const percent = grant?.completed ? 100 : (completed / total) * 100;
    return Number.isNaN(percent) ? 0 : +percent.toFixed(2);
  };

  const grantData: { stat?: number | string; title: string }[] = [
    {
      stat: isValidAmount(grant?.details?.data?.amount),
      title: "Total Grant Amount",
    },
    {
      stat: grant?.details?.data?.startDate
        ? formatDate(grant?.details?.data?.startDate * 1000)
        : undefined,
      title: "Start Date",
    },
    // {
    //   stat: grant?.details?.season,
    //   title: "Season",
    // },
    // {
    //   stat: grant?.details?.cycle,
    //   title: "Cycle",
    // },
  ];

  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      {/* Grant Overview Start */}
      <div className="mt-5 flex flex-row max-lg:flex-col-reverse gap-4 ">
        {grant?.details?.data?.description && (
          <div className="w-8/12 max-lg:w-full p-5 gap-2 bg-[#EEF4FF] dark:bg-zinc-900 dark:border-gray-800 rounded-xl  text-black dark:text-zinc-100">
            <h3 className="text-sm text-slate-600 dark:text-slate-400 uppercase font-semibold">
              GRANT DESCRIPTION
            </h3>
            <div className="mt-2">
              <MarkdownPreview
                className={markdownStyles.wmdeMarkdown}
                source={grant?.details?.data?.description}
              />
            </div>
          </div>
        )}
        <div className="w-4/12 max-lg:w-full flex flex-col gap-4">
          <div className="border border-gray-200 rounded-xl bg-white  dark:bg-zinc-900 dark:border-gray-800">
            <div className="flex items-center justify-between p-5">
              <div className="font-semibold text-black dark:text-white">
                Grant Overview
              </div>
              {/* <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"> */}
              <span
                className={`h-max items-center justify-center rounded-2xl  px-2 py-1 text-center text-xs font-medium leading-none text-white ${
                  +getPercentage() > 0 ? "bg-blue-600" : "bg-gray-500"
                }`}
              >
                {getPercentage()}% complete
              </span>
            </div>
            <div className="flex flex-col gap-4  px-5 pt-5 pb-5 border-t border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Community
                </div>
                <a
                  href={PAGES.COMMUNITY.ALL_GRANTS(
                    grant?.community?.details?.data?.slug ||
                      (grant?.community?.uid as Hex)
                  )}
                >
                  <div className="w-full inline-flex items-center gap-x-2 rounded-3xl bg-[#E0EAFF] dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={grant?.community?.details?.data?.imageURL}
                      alt=""
                      className="h-5 w-5 rounded-full"
                    />
                    <p className="max-w-xs truncate text-base font-semibold text-black dark:text-gray-100 max-md:text-sm w-full break-words whitespace-break-spaces">
                      {grant?.community?.details?.data?.name}
                    </p>
                  </div>
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Network
                </div>

                <div className="inline-flex items-center gap-x-2 rounded-full bg-[#E0EAFF] dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chainImgDictionary(
                      grant?.community?.details?.chainID as number
                    )}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                  <p className="max-w-xs truncate text-base font-semibold text-black dark:text-gray-100 max-md:text-sm  w-full break-words whitespace-break-spaces">
                    {chainNameDictionary(
                      grant?.community?.details?.chainID as number
                    )}
                  </p>
                </div>
              </div>

              {grant?.details?.data?.proposalURL ? (
                <div className="flex items-center justify-between">
                  <div className="text-gray-500  font-semibold text-base dark:text-gray-300">
                    Proposal
                  </div>
                  <ExternalLink
                    href={grant?.details?.data?.proposalURL}
                    className="inline-flex items-center gap-x-1 rounded-md  px-2 py-1 text-xs font-medium text-blue-700 dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500"
                  >
                    <span className="text-base font-semibold">Details</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </ExternalLink>
                </div>
              ) : null}
              {grantData.map((data) =>
                data.stat ? (
                  <div
                    key={data.title}
                    className="flex flex-row items-center justify-between gap-2"
                  >
                    <h4
                      className={
                        "text-gray-500  font-semibold text-base dark:text-gray-300"
                      }
                    >
                      {data.title}
                    </h4>
                    <p className={"text-base text-gray-900 dark:text-gray-100"}>
                      {data.stat}
                    </p>
                  </div>
                ) : null
              )}
            </div>
          </div>
          {grant?.details?.data?.fundUsage ? (
            <div className="border border-gray-200 rounded-xl bg-white  dark:bg-zinc-900 dark:border-gray-800">
              <div className="flex items-center justify-between p-5">
                <p className="font-semibold text-black dark:text-white">
                  Breakdown of Fund Usage
                </p>
              </div>
              <div
                className="flex flex-col gap-4 px-4 py-4 border-t border-gray-200 w-full"
                data-color-mode="light"
              >
                <MarkdownPreview
                  components={{
                    // eslint-disable-next-line react/no-unstable-nested-components
                    table: ({ children }) => {
                      return (
                        <table className="w-full text-black">{children}</table>
                      );
                    },
                  }}
                  source={grant?.details?.data?.fundUsage}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Grant Overview End */}
    </Suspense>
  );
};
