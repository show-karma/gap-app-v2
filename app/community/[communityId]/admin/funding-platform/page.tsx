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
} from "@heroicons/react/24/solid";
import Link from "next/link";
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
} from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { Line } from "@rc-component/progress";
import pluralize from "pluralize";

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
  } = useMemo(() => {
    if (!programs || programs.length === 0) {
      // Fallback values when no programs exist
      return {
        totalPrograms: 0,
        totalApplications: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
      };
    }

    const stats = programs.reduce(
      (acc, program) => {
        // Use actual API response data, with fallbacks only for missing fields
        const programStats = program.stats || {};
        return {
          totalPrograms: acc.totalPrograms + 1,
          totalApplications:
            acc.totalApplications + (programStats.totalApplications || 0),
          approved: acc.approved + (programStats.approvedApplications || 0),
          rejected: acc.rejected + (programStats.rejectedApplications || 0),
          pending: acc.pending + (programStats.pendingApplications || 0),
        };
      },
      {
        totalPrograms: 0,
        totalApplications: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
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
        const isEnabled = program.configuration?.isEnabled || false;
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
      title: "Pending",
      value: formatCurrency(statistics.pending),
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900",
      icon: (
        <ClockIcon className="h-5 w-5 text-orange-700 dark:text-orange-100" />
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
        program.stats?.total ||
          program.stats?.applicationCount ||
          program.grantPlatform?.stats?.total ||
          0
      ),
      icon: <UsersIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
  ];

  const applicationProgressPct = (program: FundingProgram) => {
    const totalApplications = program.stats?.totalApplications || 0;
    const approvedApplications = program.stats?.approvedApplications || 0;

    return (
      Number(((approvedApplications / totalApplications) * 100).toFixed(2)) || 0
    );
  };

  const applicationProgress = (program: FundingProgram) => {
    const approvedApplications = program.stats?.approvedApplications || 0;
    const rejectedApplications = program.stats?.rejectedApplications || 0;
    const pendingApplications = program.stats?.pendingApplications || 0;

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
        title: "Pending",
        value: pendingApplications,
        color: "text-orange-600",
        bgColor: "bg-orange-500",
      },
    ];
  };
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                // className="bg-white dark:bg-zinc-800 dark:border-gray-700 rounded-lg overflow-hidden relative"
                className="px-4 py-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 rounded-md border border-gray-200 bg-white dark:bg-zinc-800"
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

                {/* Program Enable/Disable Toggle */}
                <div className="flex items-center justify-start mb-3 flex-row gap-3 flex-wrap">
                  <button
                    className={cn(
                      "flex items-center space-x-2 text-sm text-zinc-900 px-2 py-1 rounded-full cursor-pointer",
                      program.configuration?.isEnabled
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-gray-100 dark:bg-zinc-700"
                    )}
                    onClick={() =>
                      handleToggleProgram(
                        program.programId,
                        program.chainID,
                        program.configuration?.isEnabled || false
                      )
                    }
                    disabled={togglingPrograms.has(
                      `${program.programId}_${program.chainID}`
                    )}
                  >
                    <div
                      className={cn(
                        "relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        program.configuration?.isEnabled
                          ? "bg-green-600 dark:bg-green-600"
                          : "bg-gray-200 dark:bg-gray-400"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                          program.configuration?.isEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        program.configuration?.isEnabled
                          ? "text-green-700 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {togglingPrograms.has(
                        `${program.programId}_${program.chainID}`
                      )
                        ? "Updating..."
                        : program.configuration?.isEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </button>
                  <span className="text-sm text-zinc-900 bg-gray-100 dark:bg-zinc-900 dark:text-zinc-100 px-2 py-1 rounded-full">
                    ID {program.programId}
                  </span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                    {program.metadata?.type}
                  </span>
                </div>
                {/* Program Header */}
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-ellipsis line-clamp-2">
                    {program.name || program.metadata?.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 overflow-hidden text-ellipsis line-clamp-2">
                    {program.metadata?.description}
                  </p>
                  <div className="flex flex-row gap-2 items-center text-xs text-gray-500 dark:text-gray-400 bg-orange-100 dark:bg-orange-900/20 p-2 rounded-md">
                    <CalendarIcon className="w-5 h-5  text-orange-700 dark:text-orange-300" />
                    <span className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      Deadline:{" "}
                      {program.metadata?.endsAt
                        ? formatDate(program.metadata?.endsAt || "")
                        : "N/A"}
                    </span>
                  </div>

                  {/* Grant Amount and Applicants */}
                  <div className="grid grid-cols-2 gap-4 my-4">
                    {cardStats(program).map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-col justify-center items-center gap-2 bg-blue-50 dark:bg-blue-900 p-4 rounded-md"
                      >
                        <div className="flex flex-row gap-2 items-center">
                          {item.icon}
                          <p className="text-blue-600 dark:text-blue-100 text-sm">
                            {item.title}
                          </p>
                        </div>
                        <p className="text-blue-600 font-bold dark:text-blue-200 text-lg">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Application Stats and Actions */}
                <div className="">
                  <div className="flex flex-row gap-4 items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Application Progress
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300 font-medium">
                      {applicationProgressPct(program)}% approval rate
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 my-3">
                    {applicationProgress(program).map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-row gap-2 items-center justify-between"
                      >
                        <div className="flex flex-row gap-2 items-center">
                          <div
                            className={cn(
                              "rounded-full w-3 h-3 min-w-3 min-h-3 max-w-3 max-h-3",
                              item.bgColor
                            )}
                          />
                          <p className={cn("text-sm", item.color)}>
                            {item.title}
                          </p>
                        </div>
                        <p className={cn("text-sm", item.color)}>
                          {formatCurrency(item.value || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="my-4">
                    <Line
                      percent={applicationProgressPct(program)}
                      strokeWidth={2}
                      strokeColor="#27ae60"
                    />
                  </div>
                </div>
                <div className="">
                  {/* Action Buttons */}
                  <div className="flex space-x-2 mb-3">
                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(
                        communityId,
                        `${program.programId}_${program.chainID}`
                      )}
                      className="flex-1"
                    >
                      <Button
                        variant="secondary"
                        className="w-full flex items-center justify-center text-xs border border-gray-200 dark:border-gray-700"
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-2" />
                        Configure Form
                      </Button>
                    </Link>

                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(
                        communityId,
                        `${program.programId}_${program.chainID}`
                      )}
                      className="flex-1"
                    >
                      <Button
                        variant="secondary"
                        className="w-full flex items-center justify-center text-xs border border-gray-200 dark:border-gray-700"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        View Applications
                      </Button>
                    </Link>
                  </div>

                  {/* Apply Button */}
                  <div className="mb-3">
                    <Link
                      href={PAGES.COMMUNITY.FUNDING_PLATFORM_APPLY(
                        communityId,
                        `${program.programId}_${program.chainID}`
                      )}
                      className="w-full"
                    >
                      <Button
                        variant="primary"
                        className="w-full flex items-center justify-center text-sm bg-green-600 text-white hover:bg-green-700"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Apply to Program
                      </Button>
                    </Link>
                  </div>
                </div>
                {/* Pending Applications Review */}
                {program.stats?.pendingApplications > 0 && (
                  <div className=" bg-orange-50 dark:bg-orange-900/20 border-none">
                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(
                        communityId,
                        `${program.programId}_${program.chainID}`
                      )}
                    >
                      <button className="rounded-lg px-2 py-2 w-full border-none text-left flex items-center justify-between text-orange-700 dark:text-orange-300 text-sm hover:text-orange-800 dark:hover:text-orange-200">
                        <span>
                          Review {program.stats?.pendingApplications}{" "}
                          {pluralize(
                            "pending application",
                            program.stats?.pendingApplications
                          )}
                        </span>
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </Link>
                  </div>
                )}
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
