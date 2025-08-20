"use client";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import {
  ApplicationListWithAPI,
  ApplicationDetailSidesheet,
} from "@/components/FundingPlatform";
import { IFundingApplication } from "@/types/funding-platform";
import { IApplicationFilters, fundingApplicationsAPI } from "@/services/fundingPlatformService";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useFundingApplications } from "@/hooks/useFundingPlatform";

export default function ApplicationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  // Get applicationId from URL if present
  const applicationId = searchParams.get("applicationId");

  // Parse initial filters from URL
  const initialFilters = useMemo((): IApplicationFilters => {
    const filters: IApplicationFilters = {};

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const status = searchParams.get("status");
    if (status) filters.status = status as any;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) filters.page = parseInt(page, 10);

    return filters;
  }, [searchParams]);

  // State for application detail sidesheet
  const [selectedApplication, setSelectedApplication] =
    useState<IFundingApplication | null>(null);
  const [isSidesheetOpen, setIsSidesheetOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { isCommunityAdmin, isLoading: isLoadingAdmin } =
    useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  // Use the funding applications hook to get applications data
  const { applications } = useFundingApplications(
    programId,
    parsedChainId,
    initialFilters
  );

  // React Query: Fetch individual application when ID is in URL
  const { data: fetchedApplication, isLoading: isLoadingApplication } = useQuery({
    queryKey: ['funding-application', applicationId],
    queryFn: () => fundingApplicationsAPI.getApplication(applicationId!),
    enabled: !!applicationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // React Query: Mutation for updating application status
  const statusMutation = useMutation({
    mutationFn: ({ applicationId, status, note }: { applicationId: string; status: string; note?: string }) => 
      fundingApplicationsAPI.updateApplicationStatus(applicationId, {
        status: status as any,
        reason: note || '',
      }),
    onSuccess: () => {
      // Invalidate and refetch application data
      queryClient.invalidateQueries({ queryKey: ['funding-applications', programId, parsedChainId] });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['funding-application', applicationId] });
      }
    },
    onError: (error) => {
      console.error("Failed to update application status:", error);
    },
  });

  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  // Handle direct URL access with applicationId
  useEffect(() => {
    if (applicationId) {
      // Try to find in already loaded applications first
      const appFromList = applications?.find(a => a.id === applicationId);
      
      if (appFromList) {
        setSelectedApplication(appFromList);
        setIsSidesheetOpen(true);
      } else if (fetchedApplication) {
        // Use the fetched application from React Query
        setSelectedApplication(fetchedApplication);
        setIsSidesheetOpen(true);
      }
    } else {
      // If applicationId is removed from URL, close the sidesheet
      setIsSidesheetOpen(false);
      setTimeout(() => setSelectedApplication(null), 300);
    }
  }, [applicationId, applications, fetchedApplication]);

  const handleBackClick = () => {
    router.push(PAGES.ADMIN.FUNDING_PLATFORM(communityId));
  };

  const handleApplicationSelect = (application: IFundingApplication) => {
    setSelectedApplication(application);
    setIsSidesheetOpen(true);
    
    // Update URL with applicationId using replace to maintain history properly
    const params = new URLSearchParams(searchParams.toString());
    params.set("applicationId", application.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Cache the application data in React Query
    queryClient.setQueryData(['funding-application', application.id], application);
  };
  
  // Prefetch application on hover for better UX
  const handleApplicationHover = (applicationId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['funding-application', applicationId],
      queryFn: () => fundingApplicationsAPI.getApplication(applicationId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const handleCloseSidesheet = () => {
    setIsSidesheetOpen(false);
    
    // Remove applicationId from URL when closing
    const params = new URLSearchParams(searchParams.toString());
    params.delete("applicationId");
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
    
    // Clear selected application after animation completes
    setTimeout(() => setSelectedApplication(null), 300);
  };

  // Handle status change for both ApplicationList and ApplicationDetailSidesheet
  const handleStatusChange = async (applicationId: string, status: string, note?: string) => {
    console.log("handleStatusChange", applicationId, status, note);
    return statusMutation.mutateAsync({ applicationId, status, note });
  };

  if (isLoadingAdmin || isLoadingApplication) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="sm:px-3 md:px-4 px-6 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Button
                onClick={handleBackClick}
                variant="secondary"
                className="flex items-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Funding Applications
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Program ID: {programId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(
                  communityId,
                  combinedProgramId
                )}
              >
                <Button variant="primary" className="flex items-center">
                  <Cog6ToothIcon className="w-4 h-4 mr-2" />
                  Configure Form
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="sm:px-3 md:px-4 px-6 py-2 flex-1 ">
        <ApplicationListWithAPI
          programId={programId}
          chainId={parsedChainId}
          showStatusActions={true}
          onApplicationSelect={handleApplicationSelect}
          onApplicationHover={handleApplicationHover}
          initialFilters={initialFilters}
          onStatusChange={handleStatusChange}
          isAdmin={true}
        />
      </div>

      {/* Application Detail Sidesheet */}
      <ApplicationDetailSidesheet
        application={selectedApplication}
        isOpen={isSidesheetOpen}
        onClose={handleCloseSidesheet}
        onStatusChange={handleStatusChange}
        showStatusActions={true}
      />

      {/* Footer */}
      <div className="bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-12 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="mb-2 sm:mb-0">
              <span>Applications are automatically evaluated using AI. </span>
              <span className="font-medium">
                Review and update statuses as needed.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
