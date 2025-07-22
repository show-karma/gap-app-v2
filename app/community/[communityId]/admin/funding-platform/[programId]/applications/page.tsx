"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import { ApplicationListWithAPI, ApplicationDetailSidesheet } from "@/components/FundingPlatform";
import { IFundingApplication } from "@/types/funding-platform";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { ArrowLeftIcon, CogIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

export default function ApplicationsPage() {
  const router = useRouter();
  const { communityId, programId: combinedProgramId } = useParams() as { 
    communityId: string; 
    programId: string; 
  };
  
  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split('_');
  const parsedChainId = parseInt(chainId, 10);
  
  // State for application detail sidesheet
  const [selectedApplication, setSelectedApplication] = useState<IFundingApplication | null>(null);
  const [isSidesheetOpen, setIsSidesheetOpen] = useState(false);
  
  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();
  
  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  const handleBackClick = () => {
    router.push(PAGES.ADMIN.FUNDING_PLATFORM(communityId));
  };

  const handleApplicationSelect = (application: IFundingApplication) => {
    setSelectedApplication(application);
    setIsSidesheetOpen(true);
  };

  const handleCloseSidesheet = () => {
    setIsSidesheetOpen(false);
    // Optional: Clear selected application after animation completes
    setTimeout(() => setSelectedApplication(null), 300);
  };

  const handleStatusChange = async (applicationId: string, status: string, note?: string) => {
    // The ApplicationListWithAPI component will handle the status update
    // We just need to update the selected application if it's the one being changed
    if (selectedApplication && selectedApplication.id === applicationId) {
      setSelectedApplication({
        ...selectedApplication,
        status: status as any,
      });
    }
  };

  if (isLoadingAdmin) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-12 py-4">
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
                href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(communityId, combinedProgramId)}
              >
                <Button
                  variant="secondary"
                  className="flex items-center"
                >
                  <CogIcon className="w-4 h-4 mr-2" />
                  Configure Form
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <ApplicationListWithAPI
            programId={programId}
            chainId={parsedChainId}
            showStatusActions={true}
            onApplicationSelect={handleApplicationSelect}
          />
        </div>
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
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-12 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="mb-2 sm:mb-0">
              <span>Applications are automatically evaluated using AI. </span>
              <span className="font-medium">Review and update statuses as needed.</span>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="#" 
                className="text-brand-blue hover:text-brand-blue/80 underline"
              >
                Evaluation Guide
              </a>
              <a 
                href="#" 
                className="text-brand-blue hover:text-brand-blue/80 underline"
              >
                Export Data
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 