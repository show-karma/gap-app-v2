"use client";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import FormBuilderErrorBoundary from "@/components/ErrorBoundary/FormBuilderErrorBoundary";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { usePostApprovalSchema, useQuestionBuilderSchema } from "@/hooks/useQuestionBuilder";
import { useStaff } from "@/hooks/useStaff";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store";
import type { FormSchema } from "@/types/question-builder";
import { MESSAGES } from "@/utilities/messages";

export default function QuestionBuilderPage() {
  const router = useRouter();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  const {
    schema: existingSchema,
    isLoading: isLoadingSchema,
    error: schemaError,
    updateSchema,
    isUpdating,
  } = useQuestionBuilderSchema(programId, parsedChainId);

  const {
    schema: existingPostApprovalSchema,
    isLoading: isLoadingPostApprovalSchema,
    error: postApprovalSchemaError,
    updateSchema: updatePostApprovalSchema,
    isUpdating: isUpdatingPostApproval,
  } = usePostApprovalSchema(programId, parsedChainId);

  const { config: existingConfig } = useProgramConfig(programId, parsedChainId);

  const handleSchemaChange = (schema: FormSchema) => {
    updateSchema({ schema, existingConfig: existingConfig || null });
  };

  const handlePostApprovalSchemaChange = (schema: FormSchema) => {
    updatePostApprovalSchema({ schema, existingConfig: existingConfig || null });
  };

  const handleBackClick = () => {
    router.push(`/community/${communityId}/admin/funding-platform`);
  };

  if (isLoadingAdmin || isStaffLoading || isLoadingSchema || isLoadingPostApprovalSchema) {
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="sm:px-3 md:px-4 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Form Builder</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Program ID: {programId} | Chain ID: {parsedChainId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {(isUpdating || isUpdatingPostApproval) && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Spinner />
                  <span className="ml-2">Saving...</span>
                </div>
              )}

              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  Form Builder
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Builder */}
      <FormBuilderErrorBoundary>
        <QuestionBuilder
          initialSchema={existingSchema || undefined}
          onSave={handleSchemaChange}
          programId={programId}
          chainId={parsedChainId}
          communityId={communityId}
          initialPostApprovalSchema={existingPostApprovalSchema || undefined}
          onSavePostApproval={handlePostApprovalSchemaChange}
        />
      </FormBuilderErrorBoundary>
    </div>
  );
}
