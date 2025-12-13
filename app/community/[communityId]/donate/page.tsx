"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import type { CommunityDetailsResponse } from "@/types/v2/community";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

export default function DonateProgramSelectPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.communityId as string;

  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Use React Query hooks
  const {
    data: programs,
    isLoading: programsLoading,
    error: programsError,
  } = useCommunityPrograms(communityId);
  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
  } = useQuery<CommunityDetailsResponse | null>({
    queryKey: ["communityDetailsV2", communityId],
    queryFn: () => getCommunityDetails(communityId),
    enabled: !!communityId,
  });

  // Combine loading and error states
  const loading = programsLoading || communityLoading;
  const error = programsError || communityError;

  // Sort programs alphabetically by title
  const sortedPrograms = useMemo(() => {
    if (!programs) return [];
    return [...programs].sort((a, b) => {
      const aTitle = a.metadata?.title || "";
      const bTitle = b.metadata?.title || "";
      return aTitle.localeCompare(bTitle);
    });
  }, [programs]);

  // Auto-redirect if only one program exists
  useEffect(() => {
    if (sortedPrograms.length === 1 && sortedPrograms[0].programId && sortedPrograms[0].chainID) {
      const combinedId = `${sortedPrograms[0].programId}_${sortedPrograms[0].chainID}`;
      router.push(`/community/${communityId}/donate/${combinedId}`);
    }
  }, [sortedPrograms, communityId, router]);

  const handleProgramSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const combinedId = e.target.value; // Format: programId_chainId
    setSelectedProgramId(combinedId);
    if (combinedId) {
      router.push(`/community/${communityId}/donate/${combinedId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading programs...</p>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load data. Please try again.";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-600 dark:text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error</h2>
          <p className="text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (sortedPrograms.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md text-center">
          <svg
            className="mx-auto h-12 w-12 text-yellow-600 dark:text-yellow-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            No Programs Available
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            There are currently no programs available for donations in this community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-full sm:px-3 md:px-4 px-6 py-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Community Header */}
        {community && (
          <div className="mb-8 text-center">
            {community.details?.logoUrl && (
              <div className="mb-4 flex justify-center">
                <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <Image
                    src={community.details.logoUrl}
                    alt={community.details.name || "Community"}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {community.details?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Support projects in this community</p>
          </div>
        )}

        {/* Program Selection Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a Program to Donate
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose which program you would like to support
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="program-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Program
              </label>
              <select
                id="program-select"
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-zinc-100 transition-colors text-base"
                onChange={handleProgramSelect}
                value={selectedProgramId}
              >
                <option value="" disabled>
                  Select a program...
                </option>
                {sortedPrograms.map((program) => {
                  // Combine programId and chainID for the value
                  const combinedId =
                    program.programId && program.chainID
                      ? `${program.programId}_${program.chainID}`
                      : program.programId || "";

                  return (
                    <option key={program.programId} value={combinedId}>
                      {program.metadata?.title || "Untitled Program"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sortedPrograms.length} {sortedPrograms.length === 1 ? "program" : "programs"}{" "}
                available
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                After selecting a program, you will be able to browse projects and add them to your
                donation cart.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
