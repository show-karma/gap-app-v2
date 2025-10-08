"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { LoadingOverlay } from "@/components/Utilities/LoadingOverlay";
import {
  PlusIcon,
  CogIcon,
  EyeIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useState, useMemo, useEffect } from "react";
import {
  fundingPlatformService,
  FundingProgram,
} from "@/services/fundingPlatformService";
import toast from "react-hot-toast";
import { FundingPlatformStatsCard } from "@/components/FundingPlatform/Dashboard/card";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  UsersIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  EyeIcon as EyeIconOutline,
} from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { Line } from "@rc-component/progress";
import pluralize from "pluralize";
import Link from "next/link";
import { envVars } from "@/utilities/enviromentVars";
import { fundingPlatformDomains } from "@/utilities/fundingPlatformDomains";

const getApplyUrlByCommunityId = (communityId: string, programId: string) => {
  if (communityId in fundingPlatformDomains) {
    const domain = fundingPlatformDomains[communityId as keyof typeof fundingPlatformDomains];
    return envVars.isDev ? `${domain.dev}/programs/${programId}/apply` : `${domain.prod}/programs/${programId}/apply`;
  } else {
    return envVars.isDev ? `${fundingPlatformDomains.shared.dev}/${communityId}/programs/${programId}/apply` : `${fundingPlatformDomains.shared.prod}/${communityId}/programs/${programId}/apply`;
  }
}

export default function FundingPlatformAdminPage() {
  const { communityId } = useParams() as { communityId: string };
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isCommunityAdmin, isLoading: isLoadingAdmin } =
    useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  const {
    programs,
    isLoading: isLoadingPrograms,
    error: programsError,
    refetch,
  } = useFundingPrograms(communityId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingPrograms, setTogglingPrograms] = useState<Set<string>>(
    new Set()
  );

  // Initialize from URL params
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [enabledFilter, setEnabledFilter] = useState<
    "all" | "enabled" | "disabled"
  >((searchParams.get("status") as "all" | "enabled" | "disabled") || "all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleToggleProgram = async (
    programId: string,
    chainId: number,
    currentEnabled: boolean
  ) => {
    const programKey = `${programId}_${chainId}`;
    setTogglingPrograms((prev) => new Set(prev).add(programKey));

    try {
      await fundingPlatformService.programs.toggleProgramStatus(
        programId,
        chainId,
        !currentEnabled
      );
      toast.success(
        `Program ${!currentEnabled ? "enabled" : "disabled"} successfully`
      );
      // Refresh the programs list
      await refetch();
    } catch (error) {
      console.error("Error toggling program status:", error);
      toast.error("Failed to update program status");
    } finally {
      setTogglingPrograms((prev) => {
        const newSet = new Set(prev);
        newSet.delete(programKey);
        return newSet;
      });
    }
  };

  // Calculate statistics from programs
  const statistics: {
    totalPrograms: number;
    totalApplications: number;
    approved: number;
    rejected: number;
    pending: number;
    revisionRequested: number;
    underReview: number;
  } = useMemo(() => {
    if (!programs || programs.length === 0) {
      // Fallback values when no programs exist
      return {
        totalPrograms: 0,
        totalApplications: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        revisionRequested: 0,
        underReview: 0,
      };
    }

    const stats = programs.reduce(
      (acc, program) => {
        // Use actual API response data, with fallbacks only for missing fields
        const programStats = program.metrics || undefined;
        return {
          totalPrograms: acc.totalPrograms + 1,
          totalApplications:
            acc.totalApplications + (programStats?.totalApplications || 0),
          approved: acc.approved + (programStats?.approvedApplications || 0),
          rejected: acc.rejected + (programStats?.rejectedApplications || 0),
          pending: acc.pending + (programStats?.pendingApplications || 0),
          revisionRequested:
            acc.revisionRequested +
            (programStats?.revisionRequestedApplications || 0),
          underReview:
            acc.underReview + (programStats?.underReviewApplications || 0),
        };
      },
      {
        totalPrograms: 0,
        totalApplications: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        revisionRequested: 0,
        underReview: 0,
      }
    );

    return stats;
  }, [programs]);

  // Filter programs based on search term and enabled status
  const filteredPrograms = useMemo(() => {
    if (!programs) return [];

    return programs.filter((program) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        program.name?.toLowerCase().includes(searchLower) ||
        program.metadata?.title?.toLowerCase().includes(searchLower) ||
        program.metadata?.description?.toLowerCase().includes(searchLower) ||
        program.programId?.toLowerCase().includes(searchLower);

      // Enabled/Disabled filter
      let matchesEnabled = true;
      if (enabledFilter !== "all") {
        const isEnabled = program.applicationConfig?.isEnabled || false;
        matchesEnabled = enabledFilter === "enabled" ? isEnabled : !isEnabled;
      }

      return matchesSearch && matchesEnabled;
    });
  }, [programs, searchTerm, enabledFilter]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) {
      params.set("search", searchTerm);
    }

    if (enabledFilter !== "all") {
      params.set("status", enabledFilter);
    }

    const queryString = params.toString();
    const newUrl = queryString
      ? `/community/${communityId}/admin/funding-platform?${queryString}`
      : `/community/${communityId}/admin/funding-platform`;

    router.push(newUrl, { scroll: false });
  }, [searchTerm, enabledFilter, communityId, router]);

  if (isLoadingAdmin || isLoadingPrograms) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  if (programsError) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            Error loading funding programs. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Programs",
      value: formatCurrency(statistics.totalPrograms),
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900",
      icon: (
        <ArrowTrendingUpIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />
      ),
    },
    {
      title: "Total Applications",
      value: formatCurrency(statistics.totalApplications),
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900",
      icon: (
        <UsersIcon className="h-5 w-5 text-purple-700 dark:text-purple-100" />
      ),
    },
    {
      title: "Approved",
      value: formatCurrency(statistics.approved),
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900",
      icon: (
        <CheckCircleIcon className="h-5 w-5 text-green-700 dark:text-green-100" />
      ),
    },
    {
      title: "Rejected",
      value: formatCurrency(statistics.rejected),
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900",
      icon: <XCircleIcon className="h-5 w-5 text-red-700 dark:text-red-100" />,
    },
    {
      title: "Pending Review",
      value: formatCurrency(statistics.pending),
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900",
      icon: (
        <ClockIcon className="h-5 w-5 text-orange-700 dark:text-orange-100" />
      ),
    },
    {
      title: "Under Review",
      value: formatCurrency(statistics.underReview),
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900",
      icon: (
        <EyeIconOutline className="h-5 w-5 text-pink-700 dark:text-pink-100" />
      ),
    },
    {
      title: "Revision Requested",
      value: formatCurrency(statistics.revisionRequested),
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900",
      icon: (
        <MagnifyingGlassIcon className="h-5 w-5 text-indigo-700 dark:text-indigo-100" />
      ),
    },
  ];

  const cardStats = (program: any) => [
    {
      title: "Funding Amount",
      value:
        formatCurrency(
          program.totalAmount || program.metadata?.totalAmount || 0
        ) || 0,
      icon: (
        <CurrencyDollarIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />
      ),
    },
    {
      title: "Applicants",
      value: formatCurrency(
        program.metrics?.totalApplications || 0
      ),
      icon: <UsersIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
  ];

  const applicationProgressPct = (program: FundingProgram) => {
    const totalApplications = program.metrics?.totalApplications || 0;
    const approvedApplications = program.metrics?.approvedApplications || 0;

    return (
      Number(((approvedApplications / totalApplications) * 100).toFixed(2)) || 0
    );
  };

  const applicationProgress = (program: FundingProgram) => {
    const approvedApplications = program.metrics?.approvedApplications || 0;
    const rejectedApplications = program.metrics?.rejectedApplications || 0;
    const pendingApplications = program.metrics?.pendingApplications || 0;
    const revisionRequestedApplications =
      program.metrics?.revisionRequestedApplications || 0;
    const underReviewApplications = program.metrics?.underReviewApplications || 0;

    return [
      {
        title: "Approved",
        value: approvedApplications,
        color: "text-green-600",
        bgColor: "bg-green-500",
      },
      {
        title: "Rejected",
        value: rejectedApplications,
        color: "text-red-600",
        bgColor: "bg-red-500",
      },
      {
        title: "Pending Review",
        value: pendingApplications,
        color: "text-orange-600",
        bgColor: "bg-orange-500",
      },
      {
        title: "Under Review",
        value: underReviewApplications,
        color: "text-pink-600",
        bgColor: "bg-pink-500",
      },
      {
        title: "Revision Requested",
        value: revisionRequestedApplications,
        color: "text-indigo-600",
        bgColor: "bg-indigo-500",
      },
    ];
  };

  return (
    <div className="sm:px-3 md:px-4 px-6 py-2 flex flex-col gap-4">
      <Link
        href={`/community/${communityId}/admin`}
        className="flex items-center border border-black dark:border-white text-black dark:text-white rounded-md py-2 px-4 w-max"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back
      </Link>
      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <FundingPlatformStatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            bgColor={stat.bgColor}
            color={stat.color}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Filters Section */}
      <div className="my-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Enabled/Disabled Filter Dropdown */}
          <div className="relative">
            <button
              className="flex items-center justify-between min-w-[160px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="capitalize">
                {enabledFilter === "all" ? "All Programs" : enabledFilter}
              </span>
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            <div
              className={cn(
                "absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-zinc-800 ring-1 ring-black ring-opacity-5 z-10",
                isDropdownOpen ? "block" : "hidden"
              )}
            >
              <div className="py-1" role="menu">
                {["all", "enabled", "disabled"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setEnabledFilter(status as typeof enabledFilter);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
                      enabledFilter === status
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      {status === "enabled" && (
                        <CheckCircleIcon className="mr-2 h-4 w-4 text-green-600" />
                      )}
                      {status === "disabled" && (
                        <XCircleIcon className="mr-2 h-4 w-4 text-gray-500" />
                      )}
                      <span className="capitalize">
                        {status === "all" ? "All Programs" : status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      {programs && programs.length > 0 ? (
        filteredPrograms.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <div
                key={`${program.programId}_${program.chainID}`}
                className="px-4 py-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 dark:border-gray-700 relative"
              >
                {/* Loading Overlay */}
                {togglingPrograms.has(
                  `${program.programId}_${program.chainID}`
                ) && (
                    <LoadingOverlay
                      message="Updating program status..."
                      isLoading={true}
                    />
                  )}

                {/* Header with Toggle and Quick Actions */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Program Enable/Disable Toggle */}
                    <div
                      className={cn(
                        "relative group",
                        !program.applicationConfig ||
                          Object.keys(program.applicationConfig).length === 1
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                      )}
                      title={
                        !program.applicationConfig ||
                          Object.keys(program.applicationConfig).length === 1
                          ? "Program doesn't have configured form"
                          : undefined
                      }
                    >
                      <button
                        className={cn(
                          "flex items-center space-x-2 text-sm text-zinc-900 px-2 py-1 rounded-full",
                          program.applicationConfig?.isEnabled
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-gray-100 dark:bg-zinc-700",
                          !program.applicationConfig ||
                            Object.keys(program.applicationConfig).length === 1
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        )}
                        onClick={() => {
                          if (program.applicationConfig) {
                            handleToggleProgram(
                              program.programId,
                              program.chainID,
                              program.applicationConfig?.isEnabled || false
                            );
                          }
                        }}
                        disabled={
                          !program.applicationConfig ||
                          Object.keys(program.applicationConfig).length === 1 ||
                          togglingPrograms.has(
                            `${program.programId}_${program.chainID}`
                          )
                        }
                      >
                        <div
                          className={cn(
                            "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                            program.applicationConfig?.isEnabled
                              ? "bg-green-600 dark:bg-green-600"
                              : "bg-gray-200 dark:bg-gray-400",
                            (!program.applicationConfig ||
                              Object.keys(program.applicationConfig).length ===
                              1) &&
                            "bg-gray-300 dark:bg-gray-600"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                              program.applicationConfig?.isEnabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            program.applicationConfig?.isEnabled
                              ? "text-green-700 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {togglingPrograms.has(
                            `${program.programId}_${program.chainID}`
                          )
                            ? "Updating..."
                            : program.applicationConfig?.isEnabled
                              ? "Enabled"
                              : "Disabled"}
                        </span>
                      </button>
                      {/* Tooltip for disabled state */}
                      {(!program.applicationConfig ||
                        Object.keys(program.applicationConfig).length === 1) && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Program doesn&apos;t have configured form
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                    </div>
                    <span className="text-xs text-zinc-600 bg-gray-100 dark:bg-zinc-900 dark:text-zinc-400 px-2 py-1 rounded-full">
                      ID {program.programId}
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                      {program.metadata?.type || "program"}
                    </span>
                  </div>

                  {/* Quick Action Icon */}
                  <div className="flex items-center gap-1">
                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(
                        communityId,
                        `${program.programId}_${program.chainID}`
                      )}
                      title="Configure Form"
                    >
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors">
                        <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Program Title and Description */}
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-ellipsis line-clamp-2">
                    {program.name || program.metadata?.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 overflow-hidden text-ellipsis line-clamp-2">
                    {program.metadata?.description}
                  </p>
                </div>

                {/* Compact Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <UsersIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs text-purple-600 dark:text-purple-400">Applicants</p>
                    </div>
                    <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(
                        program.metrics?.totalApplications || 0
                      )}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-xs text-green-600 dark:text-green-400">Approval %</p>
                    </div>
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">
                      {applicationProgressPct(program)}%
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex flex-row gap-2 items-center text-xs text-gray-500 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md mb-3">
                  <CalendarIcon className="w-4 h-4 text-orange-700 dark:text-orange-300" />
                  <span className="text-orange-700 dark:text-orange-300">
                    Deadline: {program.metadata?.endsAt
                      ? formatDate(program.metadata?.endsAt || "")
                      : "N/A"}
                  </span>
                </div>

                {/* Application Status Breakdown */}
                <div className="mb-3">
                  <div className="grid grid-cols-5 gap-2">
                    {applicationProgress(program).map((item) => (
                      <div key={item.title} className="text-center">
                        <p className={cn("text-xs font-bold", item.color)}>
                          {item.value}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {item.title.split(' ')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary CTA - View Applications */}
                <div className="flex items-center gap-2">
                  <Link
                    href={PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(
                      communityId,
                      `${program.programId}_${program.chainID}`
                    )}
                    className="flex-1"
                  >
                    <Button
                      variant="primary"
                      className="w-full hover:shadow flex items-center justify-center text-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-600"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View Applications
                    </Button>
                  </Link>

                  {/* Link to Application Icon */}
                  <Link
                    href={getApplyUrlByCommunityId(communityId, program.programId)}
                    target="_blank"
                    title="Link to application"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-8">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Programs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No programs match your search criteria. Try adjusting your
                filters.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-8">
            <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Funding Programs Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first funding program to start accepting applications
              from your community.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Your First Program
            </Button>
          </div>
        </div>
      )}

      {/* Create Program Modal - TODO: Implement in next task */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Program</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Program creation will be implemented in the next task phase.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
