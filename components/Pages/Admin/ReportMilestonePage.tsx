"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import fetchData from "@/utilities/fetchData";
import TablePagination from "@/components/Utilities/TablePagination";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { PAGES } from "@/utilities/pages";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useOwnerStore } from "@/store";
import { SearchDropdown } from "../ProgramRegistry/SearchDropdown";
import { useQueryState } from "nuqs";
import { errorManager } from "@/components/Utilities/errorManager";
import { ReasonsModal } from "@/components/Dialogs/ReasonsModal";
interface Report {
  _id: {
    $oid: string;
  };
  grantUid: string;
  grantTitle: string;
  projectUid: string;
  projectTitle: string;
  totalMilestones: number;
  pendingMilestones: number;
  completedMilestones: number;
  proofOfWorkLinks: string[];
  evaluations: Evaluation[] | null | undefined;
  projectSlug: string;
}

interface Evaluation {
  _id: string;
  rating: number;
  reasons: string[];
}
interface ReportAPIResponse {
  data: Report[];
  pageInfo: {
    totalItems: number;
    page: number;
    pageLimit: number;
  };
  uniqueProjectCount: number;
  stats: {
    totalGrants: number;
    totalProjectsWithMilestones: number;
    totalMilestones: number;
    totalCompletedMilestones: number;
    totalPendingMilestones: number;
    percentageProjectsWithMilestones: number;
    percentageCompletedMilestones: number;
    percentagePendingMilestones: number;
    proofOfWorkLinks: string[];
  };
}

export const metadata = defaultMetadata;

const fetchReports = async (
  communityId: string,
  page: number,
  pageLimit: number,
  sortBy = "totalMilestones",
  sortOrder = "desc",
  selectedGrantTitles: string[] = []
) => {
  const queryGrantTitles = selectedGrantTitles.join(",");
  // encode the queryGrantTitles
  const encodedQueryGrantTitles = encodeURIComponent(queryGrantTitles);
  const [data]: any = await fetchData(
    `${INDEXER.COMMUNITY.REPORT.GET(
      communityId as string
    )}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}${
      queryGrantTitles ? `&grantTitle=${encodedQueryGrantTitles}` : ""
    }`
  );
  return data || [];
};

const itemsPerPage = 50;

const skeletonArray = Array.from({ length: 12 }, (_, index) => index);

interface ReportMilestonePageProps {
  community: ICommunityResponse;
  grantTitles: string[];
}

export const ReportMilestonePage = ({
  community,
  grantTitles,
}: ReportMilestonePageProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isConnected && isAuth && (isAdmin || isContractOwner);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalMilestones");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedGrantTitles, setSelectedGrantTitles] = useQueryState(
    "grantTitles",
    {
      defaultValue: [] as string[],
      serialize: (value) => value?.join(","),
      parse: (value) => (value ? value.split(",") : null),
    }
  );

  const { data, isLoading } = useQuery<ReportAPIResponse>({
    queryKey: [
      "reportMilestones",
      communityId,
      currentPage,
      sortBy,
      sortOrder,
      selectedGrantTitles,
    ],
    queryFn: async () =>
      fetchReports(
        communityId,
        currentPage,
        itemsPerPage,
        sortBy,
        sortOrder,
        selectedGrantTitles
      ),
    enabled: Boolean(communityId) && isAuthorized,
  });

  const pageInfo = data?.pageInfo;
  const reports = data?.data;

  const totalItems: any = pageInfo?.totalItems || 0;

  const signer = useSigner();

  const modelToUse = "gpt-4o-mini";

  useEffect(() => {
    if (!address || !signer || !community || !isAuth) return;

    const checkIfAdmin = async () => {
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
      } catch (error: any) {
        errorManager(
          `Error checking if ${address} is admin of ${communityId}`,
          error
        );
        console.log(error);
        setIsAdmin(false);
      }
    };
    checkIfAdmin();
  }, [address, isConnected, isAuth, signer, community]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (newSort: string) => {
    if (newSort === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSort);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  function StatCard({ title, value }: { title: string; value: string }) {
    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {title}
        </h3>
        <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      {isAuthorized ? (
        <div className="w-full flex flex-col gap-6">
          <div className="w-full flex flex-row items-center justify-between">
            <Link href={PAGES.ADMIN.ROOT(communityId)}>
              <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                <ChevronLeftIcon className="h-5 w-5" />
                Return to admin page
              </Button>
            </Link>
          </div>

          <section className="flex flex-col gap-4">
            <div className="flex flex-row justify-between items-center">
              <h1 className="text-2xl font-bold">Milestones Report</h1>
              <SearchDropdown
                list={grantTitles}
                onSelectFunction={(value: string) =>
                  // onChangeGeneric(value, setSelectedGrantTitles)
                  setSelectedGrantTitles((oldArray) => {
                    setCurrentPage(1);
                    const newArray = [...oldArray];
                    if (newArray.includes(value)) {
                      const filteredArray = newArray.filter(
                        (item) => item !== value
                      );
                      return filteredArray;
                    } else {
                      newArray.push(value);
                    }
                    return newArray;
                  })
                }
                cleanFunction={() => {
                  setSelectedGrantTitles([]);
                }}
                prefixUnselected="All"
                type={"Grant Programs"}
                selected={selectedGrantTitles}
                // imageDictionary={}
              />
            </div>
            <div className="mb-2 grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 w-full">
              {isLoading ? (
                <>
                  {[...Array(8)].map((_, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow"
                    >
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-6 w-1/2" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Grants"
                    value={`${data?.stats.totalGrants}`}
                  />
                  <StatCard
                    title="Total projects with Milestones"
                    value={`${data?.stats.totalProjectsWithMilestones}`}
                  />
                  <StatCard
                    title="% of project who added Milestones"
                    value={`${
                      data?.stats?.percentageProjectsWithMilestones?.toFixed(
                        2
                      ) || 0
                    }%`}
                  />
                  <StatCard
                    title="Total Milestones"
                    value={`${data?.stats.totalMilestones}`}
                  />
                  <StatCard
                    title="Total Completed Milestones"
                    value={`${data?.stats.totalCompletedMilestones}`}
                  />
                  <StatCard
                    title="Total Pending Milestones"
                    value={`${data?.stats.totalPendingMilestones}`}
                  />
                  <StatCard
                    title="Milestones Completion %"
                    value={`${
                      data?.stats?.percentageCompletedMilestones?.toFixed(2) ||
                      0
                    }%`}
                  />
                  <StatCard
                    title="Milestones Pending %"
                    value={`${
                      data?.stats?.percentagePendingMilestones?.toFixed(2) || 0
                    }%`}
                  />
                </>
              )}
            </div>
          </section>

          <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
            <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
              <thead>
                <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("grantTitle")}
                    >
                      Grant Title
                      {sortBy === "grantTitle" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("projectTitle")}
                    >
                      Project
                      {sortBy === "projectTitle" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("totalMilestones")}
                    >
                      Total Milestones
                      {sortBy === "totalMilestones" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("pendingMilestones")}
                    >
                      Pending Milestones
                      {sortBy === "pendingMilestones" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("completedMilestones")}
                    >
                      Completed Milestones
                      {sortBy === "completedMilestones" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <button
                      className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200"
                      onClick={() => handleSort("avg_rating")}
                    >
                      Milestone quality (0 - 10)
                      {sortBy === "avg_rating" ? (
                        sortOrder === "asc" ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <p className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200">
                      Recommendation
                    </p>
                  </th>
                  <th
                    scope="col"
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    <p className="flex flex-row gap-2 items-center p-0 bg-transparent text-zinc-700 dark:text-zinc-200">
                      Outputs
                    </p>
                  </th>
                </tr>
              </thead>
              <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
                {isLoading
                  ? skeletonArray.map((index) => {
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 font-medium h-16">
                            <Skeleton className="dark:text-zinc-300 text-gray-900 px-4 py-4" />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton className="dark:text-zinc-300 text-gray-900 px-4 py-4" />
                          </td>
                          <td className="px-4 py-2">
                            {" "}
                            <Skeleton className="dark:text-zinc-300 text-gray-900 px-4 py-4 w-14" />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton className="dark:text-zinc-300 text-gray-900 px-4 py-4 w-14" />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton className="dark:text-zinc-300 text-gray-900 px-4 py-4 w-14" />
                          </td>
                        </tr>
                      );
                    })
                  : reports?.map((report, index) => {
                      const outputsFiltered = report?.proofOfWorkLinks?.filter(
                        (item) => item.length > 0
                      );
                      return (
                        <tr
                          key={index}
                          className="dark:text-zinc-300 text-gray-900 px-4 py-4"
                        >
                          <td className="px-4 py-2 font-medium h-16 max-w-[220px]">
                            <ExternalLink
                              href={PAGES.PROJECT.GRANT(
                                report.projectSlug,
                                report.grantUid
                              )}
                              className="max-w-max w-full line-clamp-2 underline"
                            >
                              {report.grantTitle}
                            </ExternalLink>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <ExternalLink
                              href={PAGES.PROJECT.OVERVIEW(report.projectSlug)}
                              className="max-w-full line-clamp-2 underline w-max"
                            >
                              {report.projectTitle}
                            </ExternalLink>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <Link
                              href={`${PAGES.PROJECT.GRANT(
                                report.projectUid,
                                report.grantUid
                              )}/milestones-and-updates#all`}
                              className="text-blue-600 hover:text-blue-800 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {report.totalMilestones}
                            </Link>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <Link
                              href={`${PAGES.PROJECT.GRANT(
                                report.projectUid,
                                report.grantUid
                              )}/milestones-and-updates#pending`}
                              className="text-blue-600 hover:text-blue-800 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {report.pendingMilestones}
                            </Link>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <Link
                              href={`${PAGES.PROJECT.GRANT(
                                report.projectSlug,
                                report.grantUid
                              )}/milestones-and-updates#completed`}
                              className="text-blue-600 hover:text-blue-800 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {report.completedMilestones}
                            </Link>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <div className="flex text-primary  ">
                              {[...Array(10)].map((_, index) => (
                                <span key={index} className="text-sm">
                                  {index + 1 <=
                                  Math.round(
                                    report?.evaluations?.find(
                                      (evaluation: Evaluation) =>
                                        evaluation._id === "gpt-4o-mini"
                                    )?.rating || 0
                                  )
                                    ? "🟢"
                                    : "🔴"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <ReasonsModal
                              text={
                                (report?.evaluations?.find(
                                  (evaluation: Evaluation) =>
                                    evaluation._id === modelToUse
                                )?.rating as number) >= 6
                                  ? "Include"
                                  : "Exclude"
                              }
                              reasons={
                                report?.evaluations?.find(
                                  (evaluation: Evaluation) =>
                                    evaluation._id === modelToUse
                                )?.reasons || []
                              }
                            />
                          </td>
                          <td className="px-4 py-2 max-w-[220px]">
                            <div className="flex flex-col gap-1 overflow-x-auto max-w-[220px] w-max">
                              {outputsFiltered.map((item, index) => (
                                <ExternalLink
                                  key={index}
                                  href={
                                    item.includes("http")
                                      ? item
                                      : `https://${item}`
                                  }
                                  className="underline text-blue-700 line-clamp-2"
                                >
                                  {item.includes("http")
                                    ? `${item.slice(0, 80)}${
                                        item.slice(0, 80).length >= 80
                                          ? "..."
                                          : ""
                                      }`
                                    : `https://${item.slice(0, 80)}${
                                        item.slice(0, 80).length >= 80
                                          ? "..."
                                          : ""
                                      }`}
                                </ExternalLink>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
              <div className="w-full">
                <TablePagination
                  currentPage={currentPage}
                  setCurrentPage={handlePageChange}
                  postsPerPage={itemsPerPage}
                  totalPosts={totalItems}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <p>
            {MESSAGES.ADMIN.NOT_AUTHORIZED(
              community?.details?.data?.name || communityId || ""
            )}
          </p>
        </div>
      )}
    </div>
  );
};
