"use client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon as EyeIconOutline,
  MagnifyingGlassIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { Line } from "@rc-component/progress";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { layoutTheme } from "@/src/helper/theme";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

/**
 * Reviewer funding platform page
 * Read-only view of funding programs for reviewers
 * Shows only programs the reviewer has access to
 */
export default function ReviewerFundingPlatformPage() {
  const { communityId } = useParams() as { communityId: string };
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get reviewer programs and filter by community
  const { programs: reviewerPrograms, isLoading: isLoadingReviewer } = useReviewerPrograms();

  // Get all programs for the community
  const {
    programs: allPrograms,
    isLoading: isLoadingPrograms,
    error: programsError,
  } = useFundingPrograms(communityId);

  // Filter programs to only show those the reviewer has access to
  const programs = useMemo(() => {
    if (!allPrograms || !reviewerPrograms) return [];

    // Create a Set of program keys for quick lookup
    const reviewerProgramKeys = new Set(reviewerPrograms.map((p) => `${p.programId}_${p.chainID}`));

    // Filter all programs to only include those in reviewer programs
    return allPrograms.filter((program) =>
      reviewerProgramKeys.has(`${program.programId}_${program.chainID}`)
    );
  }, [allPrograms, reviewerPrograms]);

  // Initialize from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">(
    (searchParams.get("status") as "all" | "enabled" | "disabled") || "all"
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      ? `/community/${communityId}/reviewer/funding-platform?${queryString}`
      : `/community/${communityId}/reviewer/funding-platform`;

    router.push(newUrl, { scroll: false });
  }, [searchTerm, enabledFilter, communityId, router]);

  if (isLoadingReviewer || isLoadingPrograms) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
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

  const _stats = [
    {
      title: "Total Programs",
      value: formatCurrency(statistics.totalPrograms),
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900",
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
    {
      title: "Total Applications",
      value: formatCurrency(statistics.totalApplications),
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900",
      icon: <UsersIcon className="h-5 w-5 text-purple-700 dark:text-purple-100" />,
    },
    {
      title: "Approved",
      value: formatCurrency(statistics.approved),
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900",
      icon: <CheckCircleIcon className="h-5 w-5 text-green-700 dark:text-green-100" />,
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
      icon: <ClockIcon className="h-5 w-5 text-orange-700 dark:text-orange-100" />,
    },
    {
      title: "Under Review",
      value: formatCurrency(statistics.underReview),
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900",
      icon: <EyeIconOutline className="h-5 w-5 text-pink-700 dark:text-pink-100" />,
    },
    {
      title: "Revision Requested",
      value: formatCurrency(statistics.revisionRequested),
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900",
      icon: <MagnifyingGlassIcon className="h-5 w-5 text-indigo-700 dark:text-indigo-100" />,
    },
  ];

  const cardStats = (program: any) => [
    {
      title: "Funding Amount",
      value: formatCurrency(program.totalAmount || program.metadata?.totalAmount || 0) || 0,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-blue-700 dark:text-blue-100" />,
    },
    {
      title: "Applicants",
      value: formatCurrency(
        program.metrics?.totalApplications ||
          program.metrics?.applicationCount ||
          program.grantPlatform?.stats?.total ||
          0
      ),
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
      {/* Back Button */}
      <div>
        <Link href={PAGES.MY_REVIEWS}>
          <Button variant="secondary" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to My Reviews
          </Button>
        </Link>
      </div>

      {/* Header with Reviewer Badge */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reviewer Dashboard
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              View and review funding applications for programs you are assigned as reviewer.
            </p>
          </div>
          <div className="flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
            <EyeIcon className="w-4 h-4 text-blue-700 dark:text-blue-300 mr-2" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Reviewer Access
            </span>
          </div>
        </div>
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
                className="px-4 py-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 rounded-md border border-gray-200 bg-white dark:bg-zinc-800"
              >
                {/* Program Status and ID */}
                <div className="flex items-center justify-start mb-3 flex-row gap-3 flex-wrap">
                  <span
                    className={cn(
                      "flex items-center space-x-2 text-sm px-2 py-1 rounded-full",
                      program.applicationConfig?.isEnabled
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        program.applicationConfig?.isEnabled ? "bg-green-600" : "bg-gray-400"
                      )}
                    />
                    <span className="font-medium">
                      {program.applicationConfig?.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </span>
                  <span className="text-sm text-zinc-900 bg-gray-100 dark:bg-zinc-900 dark:text-zinc-100 px-2 py-1 rounded-full">
                    ID {program.programId}
                  </span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                    {program.metadata?.type || "A"}
                  </span>
                </div>

                {/* Program Header */}
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-ellipsis line-clamp-2">
                    {program.name || program.metadata?.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 overflow-hidden text-ellipsis line-clamp-2 h-[46px]">
                    {program.metadata?.description}
                  </p>
                  <div className="flex flex-row gap-2 items-center text-xs text-gray-500 dark:text-gray-400 bg-orange-100 dark:bg-orange-900/20 p-2 rounded-md">
                    <CalendarIcon className="w-5 h-5 text-orange-700 dark:text-orange-300" />
                    <span className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      Deadline:{" "}
                      {program.applicationConfig?.formSchema?.settings?.applicationDeadline
                        ? formatDate(program.applicationConfig.formSchema.settings.applicationDeadline)
                        : ""}
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
                          <p className="text-blue-600 dark:text-blue-100 text-sm">{item.title}</p>
                        </div>
                        <p className="text-blue-600 font-bold dark:text-blue-200 text-lg">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Application Stats */}
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
                          <p className={cn("text-sm", item.color)}>{item.title}</p>
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

                {/* Action Buttons - View Applications and View Form */}
                <div className="flex flex-row gap-2">
                  <Link
                    href={PAGES.REVIEWER.APPLICATIONS(
                      communityId,
                      program.programId,
                      program.chainID
                    )}
                    className="w-full"
                  >
                    <Button
                      variant="primary"
                      className="w-full hover:shadow flex items-center justify-center text-sm"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Review Applications
                    </Button>
                  </Link>
                  <Link
                    href={PAGES.REVIEWER.QUESTION_BUILDER(
                      communityId,
                      program.programId,
                      program.chainID
                    )}
                    className="w-full"
                  >
                    <Button
                      variant="secondary"
                      className="w-full hover:shadow flex items-center justify-center text-sm"
                    >
                      <Cog6ToothIcon className="w-4 h-4 mr-2" />
                      View Form
                    </Button>
                  </Link>
                </div>

                {/* Pending Applications Alert */}
                {program?.metrics?.pendingApplications &&
                program.metrics.pendingApplications > 0 ? (
                  <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Link
                      href={PAGES.REVIEWER.APPLICATIONS(
                        communityId,
                        program.programId,
                        program.chainID
                      )}
                    >
                      <button
                        type="button"
                        className="rounded-lg px-2 py-2 w-full border-none text-left flex items-center justify-between text-orange-700 dark:text-orange-300 text-sm hover:text-orange-800 dark:hover:text-orange-200"
                      >
                        <span>
                          {program.metrics?.pendingApplications}{" "}
                          {pluralize("application", program.metrics?.pendingApplications)} pending
                          review
                        </span>
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                ) : null}
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
                No programs match your search criteria. Try adjusting your filters.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-8">
            <EyeIconOutline className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Programs to Review
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don&apos;t have access to any funding programs in this community yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
