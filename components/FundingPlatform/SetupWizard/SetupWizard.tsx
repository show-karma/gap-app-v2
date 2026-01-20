"use client";

import { ArrowLeftIcon, CheckCircleIcon, RocketLaunchIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import type { SetupProgress } from "@/hooks/useProgramSetupProgress";
import { cn } from "@/utilities/tailwind";
import { SetupStep } from "./SetupStep";

interface SetupWizardProps {
  communityId: string;
  programId: string;
  programName: string;
  progress: SetupProgress;
}

export function SetupWizard({ communityId, programId, programName, progress }: SetupWizardProps) {
  const router = useRouter();
  const {
    toggleStatusAsync,
    isUpdating: isEnabling,
    refetch: refetchConfig,
  } = useProgramConfig(programId);

  const dashboardUrl = `/community/${communityId}/admin/funding-platform`;

  const handleEnableProgram = async () => {
    if (!progress.isReadyToEnable) {
      toast.error("Please complete all required steps before enabling the program");
      return;
    }

    try {
      await toggleStatusAsync(true);
      // The mutation already shows success toast, so just redirect
      await refetchConfig();
      router.push(dashboardUrl);
    } catch (error) {
      // The mutation already handles error toast, just log
      console.error("Error enabling program:", error);
    }
  };

  if (progress.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // Check if program is already fully set up and enabled
  const isFullySetup = progress.steps.every((s) => s.status === "completed" || !s.required);
  const isEnabled = progress.steps.find((s) => s.id === "enable-program")?.status === "completed";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={dashboardUrl}
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Programs
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEnabled ? (
                <>
                  <CheckCircleIcon className="w-8 h-8 text-green-500 inline mr-2" />
                  Program Setup Complete!
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="w-8 h-8 text-blue-500 inline mr-2" />
                  Set Up Your Program
                </>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isEnabled
                ? `"${programName}" is now live and accepting applications.`
                : `Complete these steps to start accepting applications for "${programName}".`}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex-shrink-0 text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {progress.percentComplete}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {progress.completedCount} of {progress.totalSteps} steps
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              progress.percentComplete === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Success message when all steps are done */}
      {isEnabled && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Your program is live!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Applicants can now submit applications. You can view and manage applications from
                the dashboard.
              </p>
              <div className="mt-3 flex gap-2">
                <Link href={dashboardUrl}>
                  <Button variant="primary" className="bg-green-600 hover:bg-green-700">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link
                  href={`/community/${communityId}/admin/funding-platform/${programId}/applications`}
                >
                  <Button variant="secondary">View Applications</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-3">
        {progress.steps.map((step, index) => (
          <SetupStep
            key={step.id}
            step={step}
            stepNumber={index + 1}
            isLast={index === progress.steps.length - 1}
          />
        ))}
      </div>

      {/* Quick Enable button for ready programs */}
      {!isEnabled && progress.isReadyToEnable && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Ready to go live?</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All required steps are complete. Enable your program to start accepting
                applications.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleEnableProgram}
              isLoading={isEnabling}
              className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
            >
              <RocketLaunchIcon className="w-4 h-4 mr-2" />
              Enable Program
            </Button>
          </div>
        </div>
      )}

      {/* Skip setup link */}
      {!isEnabled && (
        <div className="mt-6 text-center">
          <Link
            href={dashboardUrl}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Skip setup and return to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
