"use client";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useGrantStore } from "@/store/grant";
import { useOwnerStore } from "@/store/owner";
import markdownStyles from "@/styles/markdown.module.css";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Suspense, useEffect } from "react";
import { Hex } from "viem";
import { ProjectGrantsOverviewLoading } from "../Loading/Grants/Overview";
import { GrantPercentage } from "./components/GrantPercentage";
import { TrackTags } from "@/components/TrackTags";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectStore } from "@/store";
import { useRouter } from "next/navigation";

const isValidAmount = (grant?: {
  amount?: Hex;
  details?: { data?: { amount?: string } };
}) => {
  // First check root-level amount (Hex format)
  if (grant?.amount) {
    const formattedAmount = formatCurrency(Number(grant?.amount));
    if (formattedAmount === "0.00") return "0";
    if (Number.isNaN(formattedAmount)) return grant?.amount;
    return formattedAmount;
  }

  // Fallback to details.data.amount
  const detailsAmount = grant?.details?.data?.amount;
  if (!detailsAmount) return undefined;

  let amountToFormat = detailsAmount;

  const split = amountToFormat.split(" ");
  const split0 = split[0]?.replace(",", "");
  if (!Number.isNaN(Number(split0)) && split.length > 1) {
    if (+split0 < 1000) {
      amountToFormat = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(+split0);
      return amountToFormat + " " + split[1];
    }
    // it should format and round to 2 decimal places without use formatCurrency
    return formatCurrency(+split0) + " " + split[1];
  }
  const number = Number(amountToFormat);
  if (Number.isNaN(number)) return amountToFormat;

  return formatCurrency(+amountToFormat);
};
export const GrantOverview = () => {
  const { grant, loading, refreshGrant } = useGrantStore();
  const isOwner = useOwnerStore((state) => state.isOwner);

  const grantData: { stat?: number | string; title: string }[] = [
    {
      stat: isValidAmount(grant),
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

  const selectedTrackIds = grant?.details?.data?.selectedTrackIds as
    | string[]
    | undefined;
  const communityId = grant?.data?.communityUID;
  const programId = grant?.details?.data?.programId;

  // Extract the base programId if it includes a chainId suffix (format: programId_chainId)
  const baseProgramId = programId?.includes("_")
    ? programId.split("_")[0]
    : programId;

  // Check if we have valid track IDs to display
  const hasTrackIds = selectedTrackIds && selectedTrackIds.length > 0;

  if (loading) {
    return <ProjectGrantsOverviewLoading />;
  }

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
              {grant && (
                <GrantPercentage
                  grant={grant}
                  className="h-max items-center justify-center rounded-2xl px-2 py-1 text-center text-xs font-medium leading-none text-white bg-blue-600"
                />
              )}
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

              {communityId && hasTrackIds && (
                <div className="flex items-center justify-between gap-2">
                  <div className="text-gray-500 text-base font-semibold dark:text-gray-300">
                    Tracks
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <TrackTags
                      communityId={communityId}
                      trackIds={selectedTrackIds}
                      className="font-medium"
                    />
                  </div>
                </div>
              )}

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
