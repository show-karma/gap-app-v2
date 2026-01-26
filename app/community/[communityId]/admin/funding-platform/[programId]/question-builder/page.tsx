"use client";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import FormBuilderErrorBoundary from "@/components/ErrorBoundary/FormBuilderErrorBoundary";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { usePostApprovalSchema, useQuestionBuilderSchema } from "@/hooks/useQuestionBuilder";
import { layoutTheme } from "@/src/helper/theme";
import type { FormSchema } from "@/types/question-builder";
import { MESSAGES } from "@/utilities/messages";

export default function QuestionBuilderPage() {
  const router = useRouter();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract normalized programId (remove chainId suffix if present)
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  const { hasAccess, isLoading: isLoadingAdmin } = useCommunityAdminAccess(communityId);

  // Fetch all programs to get program metadata (title) and chainID
  const { programs, isLoading: isLoadingPrograms } = useFundingPrograms(communityId);

  // Find the program to get its title and chainID
  const program = programs.find((p) => p.programId === programId);

  // Get chainID from the program (already fetched via useFundingPrograms)
  const chainId = program?.chainID;

  const {
    schema: existingSchema,
    isLoading: isLoadingSchema,
    error: schemaError,
    updateSchema,
    isUpdating,
  } = useQuestionBuilderSchema(programId);

  const {
    schema: existingPostApprovalSchema,
    isLoading: isLoadingPostApprovalSchema,
    error: postApprovalSchemaError,
    updateSchema: updatePostApprovalSchema,
    isUpdating: isUpdatingPostApproval,
  } = usePostApprovalSchema(programId);

  // Get existing config from program (already fetched via useFundingPrograms)
  const existingConfig = program?.applicationConfig || null;

  // Fetch reviewers to check if any are configured
  const { data: reviewers, isLoading: isLoadingReviewers } = useProgramReviewers(programId);

  // Derive computed values for sidebar completion status
  const hasReviewers = reviewers && reviewers.length > 0;
  const hasAIConfig = Boolean(existingConfig?.systemPrompt);
  const programTitle = program?.metadata?.title || program?.name;

  const handleSchemaChange = (schema: FormSchema) => {
    updateSchema({ schema, existingConfig: existingConfig || null });
  };

  const handlePostApprovalSchemaChange = (schema: FormSchema) => {
    updatePostApprovalSchema({ schema, existingConfig: existingConfig || null });
  };

  const handleBackClick = () => {
    router.push(`/community/${communityId}/admin/funding-platform`);
  };

  if (
    isLoadingAdmin ||
    isLoadingPrograms ||
    isLoadingSchema ||
    isLoadingPostApprovalSchema ||
    isLoadingReviewers
  ) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={layoutTheme.padding}>
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  if (schemaError || postApprovalSchemaError) {
    return (
      <div className="sm:px-3 md:px-4 px-6 py-2">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Error Loading Form Schema
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Unable to load the form schema. This might be the first time creating a form for this
            program.
          </p>
          <div className="flex space-x-3">
            <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-800">
      {/* Saving indicator - minimal header */}
      {(isUpdating || isUpdatingPostApproval) && (
        <div className="absolute top-4 right-4 flex items-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <Spinner />
          <span className="ml-2">Saving...</span>
        </div>
      )}

      {/* Question Builder with Sidebar */}
      <FormBuilderErrorBoundary>
        <QuestionBuilder
          initialSchema={existingSchema || undefined}
          onSave={handleSchemaChange}
          programId={programId}
          chainId={chainId}
          communityId={communityId}
          initialPostApprovalSchema={existingPostApprovalSchema || undefined}
          onSavePostApproval={handlePostApprovalSchemaChange}
          programTitle={programTitle}
          hasReviewers={hasReviewers}
          hasAIConfig={hasAIConfig}
          program={program}
        />
      </FormBuilderErrorBoundary>
    </div>
  );
}
