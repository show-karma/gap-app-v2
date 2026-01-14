"use client";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import FormBuilderErrorBoundary from "@/components/ErrorBoundary/FormBuilderErrorBoundary";
import { ProgramSettings } from "@/components/FundingPlatform/ProgramSettings";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
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

  // Fetch program config to get chainID if needed for V1 components
  const { config: programConfig } = useProgramConfig(programId);
  const chainId = programConfig?.chainID;

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

  const { config: existingConfig } = useProgramConfig(programId);

  const handleSchemaChange = async (schema: FormSchema) => {
    await updateSchema({ schema, existingConfig: existingConfig || null });
  };

  const handlePostApprovalSchemaChange = async (schema: FormSchema) => {
    await updatePostApprovalSchema({ schema, existingConfig: existingConfig || null });
  };

  const handleBackClick = () => {
    router.push(`/community/${communityId}/admin/funding-platform`);
  };

  if (isLoadingAdmin || isLoadingSchema || isLoadingPostApprovalSchema) {
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
            Error Loading Configuration
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Unable to load the program configuration. This might be the first time setting up this
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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {(isUpdating || isUpdatingPostApproval) && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Spinner />
                <span className="ml-2">Saving...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Settings */}
      <FormBuilderErrorBoundary>
        <ProgramSettings
          programId={programId}
          chainId={chainId}
          communityId={communityId}
          initialSchema={existingSchema || undefined}
          initialPostApprovalSchema={existingPostApprovalSchema || undefined}
          onSaveSchema={handleSchemaChange}
          onSavePostApprovalSchema={handlePostApprovalSchemaChange}
        />
      </FormBuilderErrorBoundary>
    </div>
  );
}
