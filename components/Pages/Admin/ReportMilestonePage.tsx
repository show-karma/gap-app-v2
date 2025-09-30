"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import TablePagination from "@/components/Utilities/TablePagination";
import { useOwnerStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { SearchDropdown } from "../ProgramRegistry/SearchDropdown";
import { GrantProgram } from "../ProgramRegistry/ProgramList";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { envVars } from "@/utilities/enviromentVars";
import { downloadCommunityReport } from "@/utilities/downloadReports";

interface Report {
  _id: {
    $oid: string;
  };
  grantUid: string;
  grantTitle: string;
  projectUid: string;
  projectTitle: string;
  programId?: string;
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
  selectedProgramIds: string[] = []
) => {
  const queryProgramIds = selectedProgramIds.join(",");
  const encodedProgramIds = encodeURIComponent(queryProgramIds);
  const [data]: any = await fetchData(
    `${INDEXER.COMMUNITY.REPORT.GET(
      communityId as string
    )}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}${queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`
  );
  return data || [];
};

const itemsPerPage = 50;

const skeletonArray = Array.from({ length: 12 }, (_, index) => index);

interface ReportMilestonePageProps {
  community: ICommunityResponse;
  grantPrograms: GrantProgram[];
}

export const ReportMilestonePage = ({
  community,
  grantPrograms,
}: ReportMilestonePageProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const { isCommunityAdmin: isAdmin } = useIsCommunityAdmin(
    community?.uid,
    address
  );
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isConnected && isAuth && (isAdmin || isContractOwner);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalMilestones");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedProgramIds, setSelectedProgramIds] = useQueryState(
    "programIds",
    {
      defaultValue: [] as string[],
      serialize: (value) => value?.join(","),
      parse: (value) => (value ? value.split(",") : null),
    }
  );

  const programOptions = useMemo(() => {
    return grantPrograms
      .filter((program) => program.programId && program.chainID !== undefined)
      .map((program) => {
        const value = `${program.programId}_${program.chainID}`;
        const title = program.metadata?.title?.trim();
        const label = title ? `${title} (${value})` : value;
        return { value, label };
      });
  }, [grantPrograms]);

  const valueToLabelMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [value, label]));
  }, [programOptions]);

  const labelToValueMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [label, value]));
  }, [programOptions]);

  const normalizedProgramIds = useMemo(() => selectedProgramIds ?? [], [selectedProgramIds]);

  const selectedProgramLabels = useMemo(() => {
    return normalizedProgramIds.map(
      (id) => valueToLabelMap.get(id) ?? id
    );
  }, [normalizedProgramIds, valueToLabelMap]);

  const programLabels = useMemo(
    () => programOptions.map(({ label }) => label),
    [programOptions]
  );

  const { data, isLoading } = useQuery<ReportAPIResponse>({
    queryKey: [
      "reportMilestones",
      communityId,
      currentPage,
      sortBy,
      sortOrder,
      normalizedProgramIds,
    ],
    queryFn: async () =>
      fetchReports(
        communityId,
        currentPage,
        itemsPerPage,
        sortBy,
        sortOrder,
        normalizedProgramIds
      ),
    enabled: Boolean(communityId) && isAuthorized,
  });

  const pageInfo = data?.pageInfo;
  const reports = data?.data;

  const totalItems: any = pageInfo?.totalItems || 0;

  const signer = useSigner();

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
    <div className="container mx-auto mt-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
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
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    downloadCommunityReport({
                      communityId,
                      sortBy,
                      selectedProgramIds:
                        normalizedProgramIds.length > 0
                          ? normalizedProgramIds
                          : undefined,
                    });
                  }}
                  className="flex items-center gap-2 py-3"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download Report
                </Button>
                <SearchDropdown
                  list={programLabels}
                  onSelectFunction={(label: string) =>
                    setSelectedProgramIds((previous) => {
                      setCurrentPage(1);
                      const programId = labelToValueMap.get(label) ?? label;
                      const current = Array.isArray(previous)
                        ? [...previous]
                        : [];
                      if (current.includes(programId)) {
                        return current.filter((item) => item !== programId);
                      }
                      current.push(programId);
                      return current;
                    })
                  }
                  cleanFunction={() => {
                    setSelectedProgramIds([]);
                  }}
                  prefixUnselected="All"
                  type={"Grant Programs"}
                  selected={selectedProgramLabels}
                  showCount={true}
                />
              </div>
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
                    value={`${data?.stats?.totalGrants}`}
                  />
                  <StatCard
                    title="Total projects with Milestones"
                    value={`${data?.stats?.totalProjectsWithMilestones}`}
                  />
                  <StatCard
                    title="% of project who added Milestones"
                    value={`${data?.stats?.percentageProjectsWithMilestones?.toFixed(
                      2
                    ) || 0
                      }%`}
                  />
                  <StatCard
                    title="Total Milestones"
                    value={`${data?.stats?.totalMilestones}`}
                  />
                  <StatCard
                    title="Total Completed Milestones"
                    value={`${data?.stats?.totalCompletedMilestones}`}
                  />
                  <StatCard
                    title="Total Pending Milestones"
                    value={`${data?.stats?.totalPendingMilestones}`}
                  />
                  <StatCard
                    title="Milestones Completion %"
                    value={`${data?.stats?.percentageCompletedMilestones?.toFixed(2) ||
                      0
                      }%`}
                  />
                  <StatCard
                    title="Milestones Pending %"
                    value={`${data?.stats?.percentagePendingMilestones?.toFixed(2) || 0
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
