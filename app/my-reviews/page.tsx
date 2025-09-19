"use client";
import { useRouter } from "next/navigation";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { EyeIcon, BuildingOfficeIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useAuthStore } from "@/store/auth";
import Image from "next/image";
import { FundingProgram } from "@/services/fundingPlatformService";
import { PAGES } from "@/utilities/pages";

/**
 * My Review page
 * Shows all communities where the user has reviewer permissions
 * Allows navigation to specific community reviewer dashboards
 */
export default function MyReviewPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { isAuth } = useAuthStore();

  // Get all programs where user is a reviewer
  const { programs: reviewerPrograms, isLoading } = useReviewerPrograms();

  // Group programs by community
  const communitiesWithPrograms = useMemo(() => {
    if (!reviewerPrograms || reviewerPrograms.length === 0) return [];

    const communityMap = new Map<string, FundingProgram & { programCount: number, totalApplications: number }>();

    reviewerPrograms.forEach((program) => {
      const communityId: string = program?.communitySlug || program.communityUID || '';
      const communityName = program?.communityName;
      const communityLogo = program?.communityImage;

      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, {
          communityUID: communityId,
          communityName,
          communityImage: communityLogo,
          programCount: 0,
          totalApplications: 0,
          ...program
        });
      }

      const community = communityMap.get(communityId)!;
      community.programCount += 1;
      community.totalApplications += program.metrics?.totalApplications || 0;
    });

    return Array.from(communityMap.values()).sort((a, b) =>
      a.communityName?.localeCompare(b.communityName || '') || 0
    );
  }, [reviewerPrograms]);

  // Check if user is authenticated
  if (!address || !isAuth) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Authentication Required
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              Please connect your wallet to view your reviewer dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    );
  }

  if (!communitiesWithPrograms || communitiesWithPrograms.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Reviewer Permissions
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You don&apos;t have reviewer permissions for any programs yet.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Community admins can assign you as a reviewer for their funding programs.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Reviews
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and review funding applications across different communities
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Communities</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">
              {communitiesWithPrograms.length}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400">Total Programs</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
              {reviewerPrograms?.length || 0}
            </p>
          </div>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communitiesWithPrograms.map((community) => (
            <div
              key={community.communityUID}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className="p-6">
                {/* Community Header */}
                <div className="flex items-center space-x-3 mb-4">
                  {community.communityImage ? (
                    <Image
                      src={community.communityImage}
                      alt={(community.communityName || community.communitySlug || community.communityUID || '')}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {community.communityName || community.communitySlug || community.communityUID}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Community
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Programs</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {community.programCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Applications</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {community.totalApplications}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={PAGES.REVIEWER.DASHBOARD(community.communitySlug || community.communityUID || '')}
                  className="block"
                >
                  <Button
                    variant="primary"
                    className="w-full flex items-center justify-center group"
                  >
                    <span>View Programs</span>
                    <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}