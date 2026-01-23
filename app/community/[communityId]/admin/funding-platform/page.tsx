"use client";
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  EyeIcon as EyeIconOutline,
  ListBulletIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CreateProgramModal } from "@/components/FundingPlatform/CreateProgramModal";
import { FundingPlatformStatsCard } from "@/components/FundingPlatform/Dashboard/card";
import {
  hasFormConfigured,
  ProgramSetupStatus,
} from "@/components/FundingPlatform/ProgramSetupStatus";
import { Button } from "@/components/Utilities/Button";
import { LoadingOverlay } from "@/components/Utilities/LoadingOverlay";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { type FundingProgram, fundingPlatformService } from "@/services/fundingPlatformService";
import { layoutTheme } from "@/src/helper/theme";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { getProgramApplyUrl } from "@/utilities/fundingPlatformUrls";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export default function FundingPlatformAdminPage() {
  const { communityId } = useParams() as { communityId: string };
  const router = useRouter();
  const searchParams = useSearchParams();

  const { hasAccess, isLoading: isLoadingAdmin } = useCommunityAdminAccess(communityId);

  const {
    programs,
    isLoading: isLoadingPrograms,
    error: programsError,
    refetch,
  } = useFundingPrograms(communityId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingPrograms, setTogglingPrograms] = useState<Set<string>>(new Set());

  // Initialize from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">(
    (searchParams.get("status") as "all" | "enabled" | "disabled") || "all"
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleToggleProgram = async (programId: string, currentEnabled: boolean) => {
    setTogglingPrograms((prev) => new Set(prev).add(programId));

    try {
      await fundingPlatformService.programs.toggleProgramStatus(programId, !currentEnabled);
      toast.success(`Program ${!currentEnabled ? "enabled" : "disabled"} successfully`);
      // Refresh the programs list
      await refetch();
    } catch {
      toast.error("Failed to update program status");
    } finally {
      setTogglingPrograms((prev) => {
        const newSet = new Set(prev);
        newSet.delete(programId);
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
          totalApplications: acc.totalApplications + (programStats?.totalApplications || 0),
          approved: acc.approved + (programStats?.approvedApplications || 0),
          rejected: acc.rejected + (programStats?.rejectedApplications || 0),
          pending: acc.pending + (programStats?.pendingApplications || 0),
          revisionRequested:
            acc.revisionRequested + (programStats?.revisionRequestedApplications || 0),
          underReview: acc.underReview + (programStats?.underReviewApplications || 0),
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
        program.metadata?.title?.toLowerCase().includes(searchLower) ||
        program.name?.toLowerCase().includes(searchLower) ||
        program.metadata?.description?.toLowerCase().includes(searchLower) ||
        program.metadata?.shortDescription?.toLowerCase().includes(searchLower) ||
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
      <div className={layoutTheme.padding}>
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  if (programsError) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            Error loading funding programs. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Filter stats to show essential ones always, and others only if they have values
  const allStats = [
    {
      title: "Total Programs",
      value: formatCurrency(statistics.totalPrograms),
      rawValue: statistics.totalPrograms,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900",
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
      alwaysShow: true,
    },
    {
      title: "Total Applications",
      value: formatCurrency(statistics.totalApplications),
      rawValue: statistics.totalApplications,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900",
      icon: <UsersIcon className="h-5 w-5 text-purple-700 dark:text-purple-100" />,
      alwaysShow: true,
    },
    {
      title: "Approved",
      value: formatCurrency(statistics.approved),
      rawValue: statistics.approved,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900",
      icon: <CheckCircleIcon className="h-5 w-5 text-green-700 dark:text-green-100" />,
      alwaysShow: false,
    },
    {
      title: "Rejected",
      value: formatCurrency(statistics.rejected),
      rawValue: statistics.rejected,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900",
      icon: <XCircleIcon className="h-5 w-5 text-red-700 dark:text-red-100" />,
      alwaysShow: false,
    },
    {
      title: "Pending Review",
      value: formatCurrency(statistics.pending),
      rawValue: statistics.pending,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900",
      icon: <ClockIcon className="h-5 w-5 text-orange-700 dark:text-orange-100" />,
      alwaysShow: false,
    },
    {
      title: "Under Review",
      value: formatCurrency(statistics.underReview),
      rawValue: statistics.underReview,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900",
      icon: <EyeIconOutline className="h-5 w-5 text-pink-700 dark:text-pink-100" />,
      alwaysShow: false,
    },
    {
      title: "Revision Requested",
      value: formatCurrency(statistics.revisionRequested),
      rawValue: statistics.revisionRequested,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900",
      icon: <MagnifyingGlassIcon className="h-5 w-5 text-indigo-700 dark:text-indigo-100" />,
      alwaysShow: false,
    },
  ];

  // Show essential stats always, others only when they have values
  const stats = allStats.filter((stat) => stat.alwaysShow || stat.rawValue > 0);

  const _cardStats = (program: Record<string, any>) => [
    {
      title: "Funding Amount",
      value: formatCurrency(program.totalAmount || program.metadata?.totalAmount || 0) || 0,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
    {
      title: "Applicants",
      value: formatCurrency(program.metrics?.totalApplications || 0),
      icon: <UsersIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
  ];

  const applicationProgressPct = (program: FundingProgram) => {
    const totalApplications = program.metrics?.totalApplications || 0;
    const approvedApplications = program.metrics?.approvedApplications || 0;

    return Number(((approvedApplications / totalApplications) * 100).toFixed(2)) || 0;
  };

  const applicationProgress = (program: FundingProgram) => {
    const approvedApplications = program.metrics?.approvedApplications || 0;
    const rejectedApplications = program.metrics?.rejectedApplications || 0;
    const pendingApplications = program.metrics?.pendingApplications || 0;
    const revisionRequestedApplications = program.metrics?.revisionRequestedApplications || 0;
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
        title: "Pending",
        value: pendingApplications,
        color: "text-orange-600",
        bgColor: "bg-orange-500",
      },
      {
        title: "In Review",
        value: underReviewApplications,
        color: "text-pink-600",
        bgColor: "bg-pink-500",
      },
      {
        title: "Revision",
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

      {/* Create Program Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center">
          <PlusIcon className="w-4 h-4 mr-2" />
          Create New Program
        </Button>
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
              type="button"
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
                    type="button"
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
                      {status === "all" && (
                        <ListBulletIcon className="mr-2 h-4 w-4 text-blue-600" />
                      )}
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
            {filteredPrograms.map((program) => {
              const hasFormConfig = hasFormConfigured(program.applicationConfig);
              const isEnabled = program.applicationConfig?.isEnabled || false;

              return (
                <div
                  key={program.programId}
                  className="px-4 py-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 dark:border-gray-700 relative"
                >
                  {/* Loading Overlay */}
                  {togglingPrograms.has(program.programId) && (
                    <LoadingOverlay message="Updating program status..." isLoading={true} />
                  )}

                  {/* Program Title - Most Prominent */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                      {program.metadata?.title || program.name}
                    </h3>
                    <ProgramSetupStatus
                      programId={program.programId}
                      communityId={communityId}
                      hasFormFields={hasFormConfigured(program.applicationConfig)}
                      isEnabled={isEnabled}
                    />
                  </div>

                  {/* Toggle and Status Row */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Accepting Submissions Toggle */}
                    <div
                      className={cn(
                        "relative group",
                        !hasFormConfig ? "cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`${isEnabled ? "Disable" : "Enable"} submissions for ${program.metadata?.title || program.name}`}
                        aria-disabled={!hasFormConfig}
                        className={cn(
                          "flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg border",
                          isEnabled
                            ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                            : "bg-gray-50 dark:bg-zinc-700 border-gray-200 dark:border-gray-600",
                          !hasFormConfig && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (hasFormConfig) {
                            handleToggleProgram(program.programId, isEnabled);
                          }
                        }}
                        disabled={!hasFormConfig || togglingPrograms.has(program.programId)}
                      >
                        <div
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            isEnabled ? "bg-green-600" : "bg-gray-300 dark:bg-gray-500",
                            !hasFormConfig && "bg-gray-200 dark:bg-gray-600"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                              isEnabled ? "translate-x-4" : "translate-x-0.5"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            isEnabled
                              ? "text-green-700 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {togglingPrograms.has(program.programId)
                            ? "Updating..."
                            : isEnabled
                              ? "Accepting submissions"
                              : "Form hidden"}
                        </span>
                      </button>
                      {/* Tooltip for disabled state */}
                      {!hasFormConfig && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Configure form first to enable submissions
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <MarkdownPreview
                      source={
                        program.metadata?.shortDescription ||
                        (program.metadata?.description as string)
                      }
                      className="text-sm overflow-hidden text-ellipsis line-clamp-2 text-gray-600 dark:text-gray-400"
                    />
                  </div>

                  {/* Compact Stats Row */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md">
                      <div className="flex items-center gap-1 mb-1">
                        <UsersIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <p className="text-xs text-purple-600 dark:text-purple-400">Applicants</p>
                      </div>
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(program.metrics?.totalApplications || 0)}
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
                      Deadline:{" "}
                      {program.metadata?.endsAt
                        ? formatDate(program.metadata.endsAt, "UTC", "YYYY-MM-DD, HH:mm UTC")
                        : "No deadline set"}
                    </span>
                  </div>

                  {/* Application Status Breakdown */}
                  <div className="mb-3">
                    <div className="grid grid-cols-5 gap-2">
                      {applicationProgress(program).map((item) => (
                        <div key={item.title} className="text-center">
                          <p className={cn("text-xs font-bold", item.color)}>{item.value}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {item.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(
                        communityId,
                        program.programId
                      )}
                      className="flex-1"
                    >
                      <Button
                        variant="primary"
                        className="w-full hover:shadow flex items-center justify-center text-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-600"
                      >
                        <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                        Applications
                      </Button>
                    </Link>

                    <Link
                      href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(
                        communityId,
                        program.programId
                      )}
                      className="flex-1"
                    >
                      <Button
                        variant="secondary"
                        className="w-full hover:shadow flex items-center justify-center text-sm"
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </Link>

                    {/* Link to Public Application Form */}
                    <Link
                      href={getProgramApplyUrl(communityId, program.programId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View public application form"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      <span>View Form</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-8">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Programs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No programs match your search criteria. Try adjusting your filters.
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
              Create your first funding program to start accepting applications from your community.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Your First Program
            </Button>
          </div>
        </div>
      )}

      {/* Create Program Modal */}
      <CreateProgramModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        communityId={communityId}
        onSuccess={async () => {
          await refetch();
        }}
      />
    </div>
  );
}
