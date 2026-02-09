"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ApplicationListWithAPI } from "@/components/FundingPlatform";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import {
  useApplication,
  useApplicationStatus,
  useFundingApplications,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import { AdminOnly, FundingPlatformGuard, useIsFundingPlatformAdmin } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import type { IFundingApplication } from "@/types/funding-platform";
import { PAGES } from "@/utilities/pages";

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  const initialFilters = useMemo((): IApplicationFilters => {
    const filters: IApplicationFilters = {};

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const status = searchParams.get("status");
    if (status) filters.status = status;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) filters.page = parseInt(page, 10);

    const sortBy = searchParams.get("sortBy");
    if (sortBy) filters.sortBy = sortBy as IApplicationFilters["sortBy"];

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) filters.sortOrder = sortOrder as IApplicationFilters["sortOrder"];

    return filters;
  }, [searchParams]);

  const isAdmin = useIsFundingPlatformAdmin();
  const { isLoading } = usePermissionContext();

  const { data: programConfig } = useProgramConfig(programId);
  const { applications: _applications } = useFundingApplications(programId, initialFilters);
  const { prefetchApplication } = useApplication(null);
  const { updateStatusAsync } = useApplicationStatus(programId);

  const handleBackClick = useBackNavigation({
    fallbackRoute: PAGES.MANAGE.FUNDING_PLATFORM.ROOT(communityId),
  });

  const handleApplicationSelect = (_application: IFundingApplication) => {
    // This function is now called by ApplicationList but we handle opening in new tab there
  };

  const handleApplicationHover = (applicationId: string) => {
    prefetchApplication(applicationId);
  };

  const handleStatusChange = async (applicationId: string, status: string, note?: string) => {
    return updateStatusAsync({ applicationId, status, note });
  };

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    );
  }

  return (
    <FundingPlatformGuard>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
          <div className="sm:px-3 md:px-4 px-6 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Funding Applications
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {programConfig?.name || `Program ID: ${programId}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <AdminOnly>
                  <Link
                    href={PAGES.MANAGE.FUNDING_PLATFORM.QUESTION_BUILDER(
                      communityId,
                      combinedProgramId
                    )}
                  >
                    <Button variant="primary" className="flex items-center">
                      <Cog6ToothIcon className="w-4 h-4 mr-2" />
                      Configure Form
                    </Button>
                  </Link>
                </AdminOnly>

                {!isAdmin && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Reviewer Mode
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="sm:px-3 md:px-4 px-6 py-2 flex-1">
          <ApplicationListWithAPI
            programId={programId}
            showStatusActions={isAdmin}
            onApplicationSelect={handleApplicationSelect}
            onApplicationHover={handleApplicationHover}
            initialFilters={initialFilters}
            onStatusChange={handleStatusChange}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </FundingPlatformGuard>
  );
}
