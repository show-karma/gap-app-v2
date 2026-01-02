"use client";

import { type FC, useState } from "react";
import { useFundingApplications, useProgramConfig } from "@/hooks/useFundingPlatform";
import ApplicationSubmission from "./ApplicationSubmission";

interface IApplicationSubmissionWithAPIProps {
  programId: string;
  chainId: number;
  onSubmissionSuccess?: (applicationId: string) => void;
  onCancel?: () => void;
}

const ApplicationSubmissionWithAPI: FC<IApplicationSubmissionWithAPIProps> = ({
  programId,
  chainId,
  onSubmissionSuccess,
  onCancel,
}) => {
  const {
    config,
    isLoading: isLoadingConfig,
    error: configError,
  } = useProgramConfig(programId);
  const { submitApplication, isSubmitting } = useFundingApplications(programId);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleSubmit = async (applicationData: Record<string, any>) => {
    try {
      setSubmissionError(null);
      await submitApplication(applicationData);
      // The mutation handles success notifications via toast
      onSubmissionSuccess?.("submitted");
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmissionError("Failed to submit application. Please try again.");
      throw error;
    }
  };

  // Show loading state while fetching form schema
  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading application form...</p>
        </div>
      </div>
    );
  }

  // Show error if form schema couldn't be loaded
  if (configError) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Unable to Load Application Form
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There was an error loading the grant application form. Please try again later.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show message if program is disabled
  if (config && !config.isEnabled) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="text-yellow-500 text-4xl">⏸️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Applications Currently Closed
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This grant program is not currently accepting applications. Please check back later.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show message if no form schema is configured
  if (!config?.formSchema || !config.formSchema.fields?.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="text-gray-400 text-4xl">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Form Not Yet Configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            The application form for this grant program has not been set up yet. Please check back
            later.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Error Message */}
      {submissionError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex">
            <div className="text-red-400 text-sm">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Submission Error
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{submissionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
      <ApplicationSubmission
        programId={programId}
        chainId={chainId}
        formSchema={config.formSchema}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default ApplicationSubmissionWithAPI;
