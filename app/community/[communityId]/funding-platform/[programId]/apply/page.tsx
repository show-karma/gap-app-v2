"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import ApplicationSubmissionWithAI from "@/components/FundingPlatform/ApplicationView/ApplicationSubmissionWithAI";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import { IFundingApplication } from "@/types/funding-platform";

export default function FundingApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  // Check if this is a revision flow
  const revisionEmail = searchParams.get('revisionEmail');
  const revisionRef = searchParams.get('ref');

  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<
    string | null
  >(null);
  const [existingApplication, setExistingApplication] = useState<IFundingApplication | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);

  const {
    config,
    isLoading: isLoadingConfig,
    error: configError,
  } = useProgramConfig(programId, parsedChainId);

  // Check for existing application if revision email/ref is provided
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!revisionEmail && !revisionRef) return;
      
      setIsCheckingExisting(true);
      try {
        let application = null;
        
        if (revisionEmail) {
          application = await fundingPlatformService.applications.getApplicationByEmail(
            programId,
            parsedChainId,
            revisionEmail
          );
        } else if (revisionRef) {
          application = await fundingPlatformService.applications.getApplicationByReference(revisionRef);
        }
        
        if (application && application.status === 'revision_requested') {
          setExistingApplication(application);
        } else if (application) {
          toast.error('This application is not eligible for revision.');
          router.push(`/community/${communityId}`);
        }
      } catch (error) {
        console.error('Error checking existing application:', error);
      } finally {
        setIsCheckingExisting(false);
      }
    };
    
    checkExistingApplication();
  }, [revisionEmail, revisionRef, programId, parsedChainId, communityId, router]);

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
      const fundingPlatformService = await import(
        "@/services/fundingPlatformService"
      );
      // Extract email from application data
      let applicantEmail = '';
      const emailFields = Object.keys(applicationData).filter(
        (key) =>
          key.toLowerCase().includes('email') ||
          (typeof applicationData[key] === 'string' &&
            applicationData[key].includes('@'))
      );
      if (emailFields.length > 0) {
        applicantEmail = applicationData[emailFields[0]];
      } else {
        throw new Error('Email field is required in the application form');
      }
      
      const result = await fundingPlatformService.default.applications.submitApplication({
        programId,
        chainID: parsedChainId,
        applicantEmail,
        applicationData
      });
      handleSubmissionSuccess(
        result.id || result.referenceNumber || "APP-" + Date.now()
      );
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
      throw error; // Re-throw to let ApplicationSubmissionWithAI handle it
    }
  };

  if (isLoadingConfig || isCheckingExisting) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {isCheckingExisting ? 'Checking existing application...' : 'Loading funding program...'}
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
        {existingApplication && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Revision Requested</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Your previous application needs revision. Please review the feedback and update your application.</p>
                  {existingApplication.statusHistory && existingApplication.statusHistory.length > 0 && (() => {
                    const revisionEntry = existingApplication.statusHistory
                      .filter(h => h.status === 'revision_requested')
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                    return revisionEntry?.reason ? (
                      <div className="mt-3 bg-yellow-100 rounded p-3">
                        <p className="font-medium mb-1">Revision reason:</p>
                        <p>{revisionEntry.reason}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <ApplicationSubmissionWithAI
          programId={programId}
          chainId={parsedChainId}
          formSchema={{
            ...config.formSchema,
            id: config.formSchema.id || `form-${programId}`,
            title: existingApplication ? "Update Your Application" : (config.formSchema.title || "Application Form"),
            settings: config.formSchema.settings || {
              submitButtonText: existingApplication ? "Update Application" : "Submit Application",
              confirmationMessage: existingApplication 
                ? "Your application has been updated and resubmitted for review."
                : "Your application has been submitted successfully"
            }
          } as any}
          existingApplication={existingApplication}
          onSubmit={handleApplicationSubmit}
          onCancel={handleCancel}
          isRevision={!!existingApplication}
        />
      </div>
    </div>
  );
}
