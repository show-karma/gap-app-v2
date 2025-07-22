"use client";
import { useParams, useRouter } from "next/navigation";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import ApplicationSubmissionWithAI from "@/components/FundingPlatform/ApplicationView/ApplicationSubmissionWithAI";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import toast from "react-hot-toast";

export default function FundingApplicationPage() {
  const router = useRouter();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<
    string | null
  >(null);

  const {
    config,
    isLoading: isLoadingConfig,
    error: configError,
  } = useProgramConfig(programId, parsedChainId);

  const handleSubmissionSuccess = (applicationId: string) => {
    setSubmittedApplicationId(applicationId);
    setApplicationSubmitted(true);
  };

  const handleCancel = () => {
    router.push(`/community/${communityId}`);
  };

  const handleBackToCommunity = () => {
    router.push(`/community/${communityId}`);
  };

  const handleApplicationSubmit = async (
    applicationData: Record<string, any>
  ) => {
    try {
      // Use the proper API service to submit application
      const { fundingApplicationsAPI } = await import(
        "@/services/fundingPlatformService"
      );
      const result = await fundingApplicationsAPI.submitApplication(
        programId,
        parsedChainId,
        applicationData
      );
      handleSubmissionSuccess(
        result.id || result.referenceNumber || "APP-" + Date.now()
      );
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
      throw error; // Re-throw to let ApplicationSubmissionWithAI handle it
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading funding program...
          </p>
        </div>
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Program Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The funding program you&apos;re looking for doesn&apos;t exist or is
            no longer available.
          </p>
          <Button
            onClick={handleBackToCommunity}
            className="flex items-center mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  if (!config.isEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Applications Closed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This funding program is not currently accepting applications. Please
            check back later or contact the community administrators.
          </p>
          <Button
            onClick={handleBackToCommunity}
            className="flex items-center mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  if (!config.formSchema) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Form Not Ready
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The application form for this funding program is still being
            configured. Please check back later.
          </p>
          <Button
            onClick={handleBackToCommunity}
            className="flex items-center mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  if (applicationSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Application Submitted!
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your funding application. We&apos;ve received your
            submission and will review it shortly.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Application Reference Number:
            </div>
            <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
              {submittedApplicationId}
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 mb-8">
            <p>• Your application has been automatically evaluated using AI</p>
            <p>• Community administrators will review your submission</p>
            <p>• You&apos;ll be notified of any status updates via email</p>
            <p>• Keep your reference number for future inquiries</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleBackToCommunity}
              variant="secondary"
              className="flex items-center justify-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Community
            </Button>

            <Button
              onClick={() => {
                setApplicationSubmitted(false);
                setSubmittedApplicationId(null);
              }}
              className="flex items-center justify-center"
            >
              Submit Another Application
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ApplicationSubmissionWithAI
          programId={programId}
          chainId={parsedChainId}
          formSchema={config.formSchema}
          onSubmit={handleApplicationSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
