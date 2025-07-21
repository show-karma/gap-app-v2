"use client";
import { useParams } from "next/navigation";
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
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { MESSAGES } from "@/utilities/messages";
import { cn } from "@/utilities/tailwind";
import { useState, useMemo } from "react";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import toast from "react-hot-toast";

export default function FundingPlatformAdminPage() {
  const { communityId } = useParams() as { communityId: string };
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
  const statistics = useMemo(() => {
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
        const programStats =
          program.stats || program.grantPlatform?.stats || {};
        return {
          totalPrograms: acc.totalPrograms + 1,
          totalApplications:
            acc.totalApplications +
            (programStats.total || programStats.applicationCount || 0),
          approved: acc.approved + (programStats.approved || 0),
          rejected: acc.rejected + (programStats.rejected || 0),
          pending:
            acc.pending + (programStats.pending || programStats.submitted || 0),
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

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {/* Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {statistics.totalPrograms}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Programs
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {statistics.totalApplications}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Applications
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {statistics.approved}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Approved
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">
            {statistics.rejected}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Rejected
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {statistics.pending}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pending
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      {programs && programs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program: any) => (
            <div
              key={`${program.programId}_${program.chainID}`}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative"
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

              {/* Program Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {program.type || program.metadata?.type || "Retro Grant"}
                  </span>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mr-1"></span>
                    {program.deadline || program.endDate ? (
                      <>
                        Deadline is{" "}
                        {new Date(
                          program.deadline || program.endDate
                        ).toLocaleDateString()}{" "}
                        <span className="text-red-600 ml-1">
                          01:12:13 min left
                        </span>
                      </>
                    ) : (
                      "Deadline coming on Sep 2, 3 weeks left"
                    )}
                  </div>
                </div>

                {/* Program Enable/Disable Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Program Status:
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
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
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          program.configuration?.isEnabled
                            ? "bg-green-600"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            program.configuration?.isEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          )}
                        />
                      </button>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          program.configuration?.isEnabled
                            ? "text-green-600"
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
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    ID: {program.programId}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {program.title ||
                    program.metadata?.title ||
                    "Web3 Analytics Infrastructure Grant"}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {program.description ||
                    program.metadata?.description ||
                    "Retroactive funding for projects that have already delivered significant impact to the Ethereum and Optimism ecosystems."}
                </p>

                {/* Grant Amount and Applicants */}
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Grant Amount
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {program.totalAmount ||
                        program.metadata?.totalAmount ||
                        "+1M available"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Applicants
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {program.stats?.total ||
                        program.stats?.applicationCount ||
                        program.grantPlatform?.stats?.total ||
                        144}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Applications Review */}
              {(program.stats?.pending ||
                program.stats?.submitted ||
                program.grantPlatform?.stats?.pending ||
                0) > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-b border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/community/${communityId}/admin/funding-platform/${program.programId}_${program.chainID}/applications`}
                  >
                    <button className="w-full text-left flex items-center justify-between text-orange-700 dark:text-orange-300 text-sm hover:text-orange-800 dark:hover:text-orange-200">
                      <span>
                        Review{" "}
                        {program.stats?.pending ||
                          program.stats?.submitted ||
                          program.grantPlatform?.stats?.pending ||
                          120}{" "}
                        Pending Applications
                      </span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </Link>
                </div>
              )}

              {/* Application Stats and Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <button className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                    View Application Stats
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  </button>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>{program.stats?.approved || 12} Approved</span>
                    <span>{program.stats?.rejected || 16} Rejected</span>
                    <span>{program.stats?.pending || 120} Pending</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mb-3">
                  <Link
                    href={`/community/${communityId}/admin/funding-platform/${program.programId}_${program.chainID}/question-builder`}
                    className="flex-1"
                  >
                    <Button
                      variant="secondary"
                      className="w-full flex items-center justify-center text-xs"
                    >
                      <CogIcon className="w-4 h-4 mr-1" />
                      Configure Form
                    </Button>
                  </Link>

                  <Link
                    href={`/community/${communityId}/admin/funding-platform/${program.programId}_${program.chainID}/applications`}
                    className="flex-1"
                  >
                    <Button
                      variant="custom"
                      className="w-full flex items-center justify-center text-xs bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View Applications
                    </Button>
                  </Link>
                </div>

                {/* Apply Button */}
                <div className="mb-3">
                  <Link
                    href={`/community/${communityId}/funding-platform/${program.programId}_${program.chainID}/apply`}
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

                {/* Additional Actions */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    ⋮
                  </button>
                  <div className="flex space-x-3">
                    <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Configure
                    </button>
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 flex items-center">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
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
