"use client";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { getGrants } from "@/utilities/sdk/communities/getGrants";
import { Hex } from "viem";
import fetchData from "@/utilities/fetchData";
import TablePagination from "@/components/Utilities/TablePagination";
import { CheckIcon, ChevronLeftIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import pluralize from "pluralize";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { CategoryCreationDialog } from "@/components/Pages/Admin/CategoryCreationDialog";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { INDEXER } from "@/utilities/indexer";
import { reduceText } from "@/utilities/reduceText";
import { defaultMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useOwnerStore } from "@/store";

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
}

interface ReportAPIResponse {
  data: Report[];
  pageInfo: {
    totalItems: number;
    page: number;
    pageLimit: number;
  };
}

export const metadata = defaultMetadata;

const fetchReports = async (
  communityId: string,
  page: number,
  pageLimit: number,
  sortBy = "totalMilestones",
  sortOrder = "desc"
) => {
  const [data]: any = await fetchData(
    `${INDEXER.COMMUNITY.REPORT.GET(
      communityId as string
    )}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}`
  );
  return data || [];
};

const itemsPerPage = 12;

const skeletonArray = Array.from({ length: 12 }, (_, index) => index);

interface ReportMilestonePageProps {
  community: ICommunityResponse;
}

export const ReportMilestonePage = ({
  community,
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

  const { data, isLoading } = useQuery<ReportAPIResponse>({
    queryKey: ["reportMilestones", communityId, currentPage, sortBy, sortOrder],
    queryFn: async () =>
      fetchReports(communityId, currentPage, itemsPerPage, sortBy, sortOrder),
    enabled: Boolean(communityId) && isAuthorized,
  });

  const pageInfo = data?.pageInfo;
  const reports = data?.data;

  const totalItems: any = pageInfo?.totalItems || 0;

  const signer = useSigner();

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
      } catch (error) {
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
                    className="h-12 px-4 text-left align-middle font-medium max-w-max"
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
                    className="h-12 px-4 text-left align-middle font-medium max-w-max"
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
                    className="h-12 px-4 text-left align-middle font-medium max-w-max"
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
                      return (
                        <tr
                          key={index}
                          className="dark:text-zinc-300 text-gray-900 px-4 py-4"
                        >
                          <td className="px-4 py-2 font-medium h-16">
                            <ExternalLink
                              href={PAGES.PROJECT.GRANT(
                                report.projectUid,
                                report.grantUid
                              )}
                              className="max-w-max w-full line-clamp-2 underline"
                            >
                              {report.grantTitle}
                            </ExternalLink>
                          </td>
                          <td className="px-4 py-2">
                            <ExternalLink
                              href={PAGES.PROJECT.OVERVIEW(report.projectUid)}
                              className="max-w-full line-clamp-2 underline w-max"
                            >
                              {report.projectTitle}
                            </ExternalLink>
                          </td>
                          <td className="px-4 py-2">
                            {report.totalMilestones}
                          </td>
                          <td className="px-4 py-2">
                            {report.pendingMilestones}
                          </td>
                          <td className="px-4 py-2">
                            {report.completedMilestones}
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
              community?.details?.data.name || communityId || ""
            )}
          </p>
        </div>
      )}
    </div>
  );
};
