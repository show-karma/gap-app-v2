import { useMemo } from "react";
import { useProgramConfig } from "./useFundingPlatform";
import { useProgramReviewers } from "./useProgramReviewers";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "pending" | "disabled";
  required: boolean;
  href: string;
  actionLabel: string;
}

export interface SetupProgress {
  steps: SetupStep[];
  completedCount: number;
  totalRequired: number;
  totalSteps: number;
  isReadyToEnable: boolean;
  missingRequired: string[];
  percentComplete: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to calculate the setup progress of a funding program.
 * Determines which setup steps have been completed and which are still pending.
 */
export function useProgramSetupProgress(communityId: string, programId: string): SetupProgress {
  const { config, isLoading: isLoadingConfig, error: configError } = useProgramConfig(programId);
  const {
    data: reviewers,
    isLoading: isLoadingReviewers,
    error: reviewersError,
  } = useProgramReviewers(programId);

  const isLoading = isLoadingConfig || isLoadingReviewers;
  const error = configError || reviewersError || null;

  const progress = useMemo<SetupProgress>(() => {
    const baseUrl = `/community/${communityId}/admin/funding-platform/${programId}`;

    // Check if form has fields configured
    const hasFormFields = config?.formSchema?.fields && config.formSchema.fields.length > 0;

    // Check if reviewers are added
    const hasReviewers = reviewers && reviewers.length > 0;

    // Check if email templates are customized (non-default)
    const hasCustomEmailTemplates =
      config?.formSchema?.settings?.approvalEmailTemplate ||
      config?.formSchema?.settings?.rejectionEmailTemplate;

    // Check if AI config is set up
    const hasAIConfig = config?.systemPrompt || config?.detailedPrompt || config?.aiModel;

    // Check if program is enabled
    const isEnabled = config?.isEnabled === true;

    const steps: SetupStep[] = [
      {
        id: "program-created",
        title: "Create Program",
        description: "Program details have been saved",
        status: "completed", // Always completed if we're on this page
        required: true,
        href: `${baseUrl}/question-builder?tab=program-details`,
        actionLabel: "Edit Details",
      },
      {
        id: "application-form",
        title: "Build Application Form",
        description: "Define the questions applicants will answer",
        status: hasFormFields ? "completed" : "pending",
        required: true,
        href: `${baseUrl}/question-builder?tab=build`,
        actionLabel: hasFormFields ? "Edit Form" : "Start Building",
      },
      {
        id: "reviewers",
        title: "Add Reviewers",
        description: "Invite team members to review applications",
        status: hasReviewers ? "completed" : "pending",
        required: false,
        href: `${baseUrl}/question-builder?tab=reviewers`,
        actionLabel: hasReviewers ? "Manage Reviewers" : "Add Reviewers",
      },
      {
        id: "email-templates",
        title: "Configure Email Templates",
        description: "Customize approval and rejection emails",
        status: hasCustomEmailTemplates ? "completed" : "pending",
        required: false,
        href: `${baseUrl}/question-builder?tab=settings`,
        actionLabel: hasCustomEmailTemplates ? "Edit Templates" : "Configure",
      },
      {
        id: "ai-config",
        title: "Set Up AI Evaluation",
        description: "Configure AI-powered application scoring",
        status: hasAIConfig ? "completed" : "pending",
        required: false,
        href: `${baseUrl}/question-builder?tab=ai-config`,
        actionLabel: hasAIConfig ? "Edit AI Config" : "Set Up",
      },
      {
        id: "enable-program",
        title: "Enable Program",
        description: "Make your program live and start accepting applications",
        status: isEnabled ? "completed" : hasFormFields ? "pending" : "disabled",
        required: true,
        href: `${baseUrl}/question-builder?tab=program-details`,
        actionLabel: isEnabled ? "Enabled" : "Enable Program",
      },
    ];

    const completedSteps = steps.filter((s) => s.status === "completed");
    const requiredSteps = steps.filter((s) => s.required);
    const missingRequired = requiredSteps
      .filter((s) => s.status !== "completed")
      .map((s) => s.title);

    // Program is ready to enable if all required steps except "enable-program" are completed
    const requiredBeforeEnable = requiredSteps.filter((s) => s.id !== "enable-program");
    const isReadyToEnable = requiredBeforeEnable.every((s) => s.status === "completed");

    const percentComplete = Math.round((completedSteps.length / steps.length) * 100);

    return {
      steps,
      completedCount: completedSteps.length,
      totalRequired: requiredSteps.length,
      totalSteps: steps.length,
      isReadyToEnable,
      missingRequired,
      percentComplete,
      isLoading,
      error,
    };
  }, [communityId, programId, config, reviewers, isLoading, error]);

  return progress;
}
