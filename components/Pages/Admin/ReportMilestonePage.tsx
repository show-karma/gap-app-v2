"use client";
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FlagIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import TablePagination from "@/components/Utilities/TablePagination";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import type { Community } from "@/types/v2/community";
import { downloadCommunityReport } from "@/utilities/downloadReports";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { validateProgramIdentifiers } from "@/utilities/validators";

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
  isGrantCompleted?: boolean;
  proofOfWorkLinks: string[];
  evaluations: Evaluation[] | null | undefined;
  projectSlug: string;
}

interface Evaluation {
  _id: string;
  rating: number;
  reasons: string[];
}

type MilestoneCompletion = Pick<
  Report,
  "totalMilestones" | "pendingMilestones" | "completedMilestones" | "isGrantCompleted"
>;

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
  // Normalize programIds (remove chainId suffix if present) before sending to API
  const normalizedProgramIds = selectedProgramIds.map((id) =>
    id.includes("_") ? id.split("_")[0] : id
  );
  const queryProgramIds = normalizedProgramIds.join(",");
  const encodedProgramIds = encodeURIComponent(queryProgramIds);
  const [data]: any = await fetchData(
    `${INDEXER.COMMUNITY.REPORT.GET(
      communityId as string
    )}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}${
      queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`
  );
  return data || [];
};

const itemsPerPage = 50;

const skeletonArray = Array.from({ length: 12 }, (_, index) => index);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
}

function StatCard({ title, value, icon, accentColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 transition-all">
      <div className={cn("p-2.5 rounded-lg flex-shrink-0", accentColor)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
      </div>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}

function SortableHeader({ label, field, sortBy, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = sortBy === field;
  return (
    <th scope="col" className="h-11 px-4 text-left align-middle font-medium">
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors",
          isActive
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        )}
        onClick={() => onSort(field)}
      >
        {label}
        {isActive ? (
          sortOrder === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-orange-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-8">{pct}%</span>
    </div>
  );
}

function MilestonesReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
          >
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center h-11 px-4 gap-6">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-4 h-14 border-b border-gray-100 dark:border-zinc-800 last:border-b-0"
          >
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ReportMilestonePageProps {
  community: Community;
  grantPrograms: GrantProgram[];
}

export const ReportMilestonePage = ({ community, grantPrograms }: ReportMilestonePageProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const {
    hasAccess,
    isLoading: isLoadingAdminAccess,
    checks,
  } = useCommunityAdminAccess(community?.uid);

  // Use RBAC to check milestone reviewer status
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);
  // Get RBAC context for loading state and reviewer access (context-aware)
  const { isLoading: isLoadingRbac, isReviewer } = usePermissionContext();
  // Get programs where user is a reviewer (for filtering dropdown)
  const { programs: reviewerPrograms, isLoading: isLoadingReviewerPrograms } =
    useReviewerPrograms();

  const isAuthorized = useMemo(() => {
    if (!isConnected || !isAuth) {
      return false;
    }
    if (hasAccess) {
      return true;
    }
    return isMilestoneReviewer || isReviewer;
  }, [isConnected, isAuth, hasAccess, isMilestoneReviewer, isReviewer]);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalMilestones");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedProgramIds, setSelectedProgramIds] = useQueryState("programIds", {
    defaultValue: [] as string[],
    serialize: (value) => {
      const normalized = value?.map((id) => (id.includes("_") ? id.split("_")[0] : id)) ?? [];
      return normalized.join(",");
    },
    parse: (value) => {
      if (!value) return null;
      return value.split(",").map((id) => (id.includes("_") ? id.split("_")[0] : id));
    },
  });

  // Get the set of program IDs the user is a reviewer for (normalized)
  const reviewerProgramIds = useMemo(() => {
    if (!reviewerPrograms || reviewerPrograms.length === 0) return new Set<string>();
    return new Set(
      reviewerPrograms.map((p) => {
        const id = p.programId;
        return id.includes("_") ? id.split("_")[0] : id;
      })
    );
  }, [reviewerPrograms]);

  const programOptions = useMemo(() => {
    const allPrograms = grantPrograms
      .filter(
        (program): program is typeof program & { programId: string } =>
          typeof program.programId === "string" && program.programId.length > 0
      )
      .map((program) => {
        const value = program.programId;
        const title = program.metadata?.title?.trim();
        const label = title ? `${title} (${value})` : value;
        return { value, label };
      });

    if (hasAccess) {
      return allPrograms;
    }
    return allPrograms.filter((program) => reviewerProgramIds.has(program.value));
  }, [grantPrograms, hasAccess, reviewerProgramIds]);

  const valueToLabelMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [value, label]));
  }, [programOptions]);

  const labelToValueMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [label, value]));
  }, [programOptions]);

  // Validate and sanitize program IDs from query parameters
  const normalizedProgramIds = useMemo(() => {
    const ids = selectedProgramIds ?? [];

    if (ids.length === 0) {
      return [];
    }

    const normalizedIds = ids.map((id) => (id.includes("_") ? id.split("_")[0] : id));
    const validation = validateProgramIdentifiers(normalizedIds);

    if (validation.errors.length > 0) {
      console.error("Invalid program IDs detected:", validation.errors);
      validation.errors.forEach(({ id, error }) => {
        console.warn(`Invalid program ID '${id}': ${error}`);
      });
    }

    return validation.validIds.map(({ programId }) => programId);
  }, [selectedProgramIds]);

  // Show warning when invalid program IDs are detected
  useEffect(() => {
    const ids = selectedProgramIds ?? [];
    if (ids.length > 0) {
      const validation = validateProgramIdentifiers(ids);
      if (validation.errors.length > 0) {
        toast.error(`Invalid program IDs detected and filtered out. Please check the URL.`, {
          duration: 5000,
        });
      }
    }
  }, [selectedProgramIds]);

  const selectedProgramLabels = useMemo(() => {
    return normalizedProgramIds.map((id) => valueToLabelMap.get(id) ?? id);
  }, [normalizedProgramIds, valueToLabelMap]);

  const programLabels = useMemo(() => programOptions.map(({ label }) => label), [programOptions]);

  // For reviewers (non-admins), automatically filter by their programs if no explicit filter is set
  const effectiveProgramIds = useMemo(() => {
    if (normalizedProgramIds.length > 0) {
      if (!hasAccess && reviewerProgramIds.size > 0) {
        return normalizedProgramIds.filter((id) => reviewerProgramIds.has(id));
      }
      return normalizedProgramIds;
    }

    if (!hasAccess && reviewerProgramIds.size > 0) {
      return Array.from(reviewerProgramIds);
    }

    return normalizedProgramIds;
  }, [normalizedProgramIds, hasAccess, reviewerProgramIds]);

  const { data, isLoading } = useQuery<ReportAPIResponse>({
    queryKey: [
      "reportMilestones",
      communityId,
      currentPage,
      sortBy,
      sortOrder,
      effectiveProgramIds,
    ],
    queryFn: async () =>
      fetchReports(communityId, currentPage, itemsPerPage, sortBy, sortOrder, effectiveProgramIds),
    enabled: Boolean(communityId) && isAuthorized,
  });

  const pageInfo = data?.pageInfo;
  const reports = data?.data;
  const totalItems: any = pageInfo?.totalItems || 0;

  const _signer = useSigner();

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

  const isFullyCompleted = useCallback((report: MilestoneCompletion) => {
    const allMilestonesComplete =
      report.totalMilestones > 0 &&
      report.pendingMilestones === 0 &&
      report.completedMilestones === report.totalMilestones;

    const grantCompleted = report.isGrantCompleted === true;

    return allMilestonesComplete || grantCompleted;
  }, []);

  // Show skeleton while checking permissions
  const isCheckingPermissions = isLoadingRbac || isLoadingAdminAccess || isLoadingReviewerPrograms;

  if (isCheckingPermissions) {
    return <MilestonesReportSkeleton />;
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.details?.name || communityId || "")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Milestones Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track milestone progress across all grant programs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              downloadCommunityReport({
                communityId,
                sortBy,
                selectedProgramIds:
                  normalizedProgramIds.length > 0 ? normalizedProgramIds : undefined,
              });
            }}
            className="flex items-center gap-2 py-2.5"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <SearchDropdown
            list={programLabels}
            onSelectFunction={(label: string) =>
              setSelectedProgramIds((previous) => {
                setCurrentPage(1);
                const programId = labelToValueMap.get(label) ?? label;
                const current = Array.isArray(previous) ? [...previous] : [];
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
            >
              <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-7 w-16 rounded" />
                <Skeleton className="h-3.5 w-28 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Grants"
              value={`${data?.stats?.totalGrants ?? 0}`}
              icon={
                <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              }
              accentColor="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard
              title="Projects with Milestones"
              value={`${data?.stats?.totalProjectsWithMilestones ?? 0}`}
              icon={<FolderOpenIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              accentColor="bg-indigo-50 dark:bg-indigo-900/20"
            />
            <StatCard
              title="% with Milestones"
              value={`${data?.stats?.percentageProjectsWithMilestones?.toFixed(1) ?? 0}%`}
              icon={<ChartBarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
              accentColor="bg-sky-50 dark:bg-sky-900/20"
            />
            <StatCard
              title="Total Milestones"
              value={`${data?.stats?.totalMilestones ?? 0}`}
              icon={<FlagIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
              accentColor="bg-purple-50 dark:bg-purple-900/20"
            />
            <StatCard
              title="Completed"
              value={`${data?.stats?.totalCompletedMilestones ?? 0}`}
              icon={<CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
              accentColor="bg-green-50 dark:bg-green-900/20"
            />
            <StatCard
              title="Pending"
              value={`${data?.stats?.totalPendingMilestones ?? 0}`}
              icon={<ClockIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
              accentColor="bg-orange-50 dark:bg-orange-900/20"
            />
            <StatCard
              title="Completion Rate"
              value={`${data?.stats?.percentageCompletedMilestones?.toFixed(1) ?? 0}%`}
              icon={
                <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              }
              accentColor="bg-emerald-50 dark:bg-emerald-900/20"
            />
            <StatCard
              title="Pending Rate"
              value={`${data?.stats?.percentagePendingMilestones?.toFixed(1) ?? 0}%`}
              icon={
                <ExclamationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              }
              accentColor="bg-amber-50 dark:bg-amber-900/20"
            />
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800/50">
              <tr>
                <SortableHeader
                  label="Grant Title"
                  field="grantTitle"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Project"
                  field="projectTitle"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Total"
                  field="totalMilestones"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Pending"
                  field="pendingMilestones"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Completed"
                  field="completedMilestones"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <th
                  scope="col"
                  className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading
                ? skeletonArray.map((index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-36 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-10 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-10 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-8 rounded" />
                          <Skeleton className="h-1.5 w-16 rounded-full" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </td>
                    </tr>
                  ))
                : reports?.map((report, index) => {
                    const completed = isFullyCompleted(report);
                    return (
                      <tr
                        key={report._id?.$oid || index}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <ExternalLink
                              href={PAGES.PROJECT.GRANT(report.projectSlug, report.grantUid)}
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                            >
                              {report.grantTitle}
                            </ExternalLink>
                            {completed && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap flex-shrink-0">
                                Done
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <ExternalLink
                            href={PAGES.PROJECT.OVERVIEW(report.projectSlug)}
                            className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                          >
                            {report.projectTitle}
                          </ExternalLink>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`${PAGES.PROJECT.GRANT(
                              report.projectUid,
                              report.grantUid
                            )}/milestones-and-updates#all`}
                            className="text-sm text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 tabular-nums transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {report.totalMilestones}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`${PAGES.PROJECT.GRANT(
                              report.projectUid,
                              report.grantUid
                            )}/milestones-and-updates#pending`}
                            className={cn(
                              "text-sm tabular-nums transition-colors",
                              report.pendingMilestones > 0
                                ? "text-orange-600 dark:text-orange-400 font-medium"
                                : "text-gray-500 dark:text-gray-400"
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {report.pendingMilestones}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`${PAGES.PROJECT.GRANT(
                                report.projectSlug,
                                report.grantUid
                              )}/milestones-and-updates#completed`}
                              className="text-sm text-gray-900 dark:text-white tabular-nums hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {report.completedMilestones}
                            </Link>
                            <ProgressBar
                              completed={report.completedMilestones}
                              total={report.totalMilestones}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {report.programId && (
                            <Link
                              href={PAGES.REVIEWER.FUNDING_PLATFORM.MILESTONES(
                                communityId,
                                report.programId.includes("_")
                                  ? report.programId.split("_")[0]
                                  : report.programId,
                                report.projectUid
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button className="py-1.5 px-3 text-xs">Review</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          setCurrentPage={handlePageChange}
          postsPerPage={itemsPerPage}
          totalPosts={totalItems}
        />
      </div>
    </div>
  );
};
