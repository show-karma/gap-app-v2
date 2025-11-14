"use client"
import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/solid"
import { useParams, useRouter } from "next/navigation"
import { QuestionBuilder } from "@/components/QuestionBuilder"
import { Button } from "@/components/Utilities/Button"
import { Spinner } from "@/components/Utilities/Spinner"
import { usePermissions } from "@/hooks/usePermissions"
import { usePostApprovalSchema, useQuestionBuilderSchema } from "@/hooks/useQuestionBuilder"
import { layoutTheme } from "@/src/helper/theme"
import { PAGES } from "@/utilities/pages"

/**
 * Reviewer Question Builder Page
 * Provides read-only view of the application form configuration
 * Reuses the QuestionBuilder component with all interactions disabled
 */
export default function ReviewerQuestionBuilderPage() {
  const router = useRouter()
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string
    programId: string
  }

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_")
  const parsedChainId = parseInt(chainId, 10)

  // Check if user is a reviewer for this program
  const { hasPermission: canView, isLoading: isLoadingPermission } = usePermissions({
    programId,
    chainID: parsedChainId,
    action: "read",
  })

  // Load the existing schema
  const {
    schema: existingSchema,
    isLoading: isLoadingSchema,
    error: schemaError,
  } = useQuestionBuilderSchema(programId, parsedChainId)

  const {
    schema: existingPostApprovalSchema,
    isLoading: isLoadingPostApprovalSchema,
    error: postApprovalSchemaError,
  } = usePostApprovalSchema(programId, parsedChainId)

  const handleBackClick = () => {
    router.push(PAGES.REVIEWER.DASHBOARD(communityId))
  }

  const handleViewApplications = () => {
    router.push(PAGES.REVIEWER.APPLICATIONS(communityId, programId, parsedChainId))
  }

  if (isLoadingPermission || isLoadingSchema || isLoadingPostApprovalSchema) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    )
  }

  if (!canView) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            You don&apos;t have permission to view the form builder for this program.
          </p>
          <Button onClick={handleBackClick} variant="secondary" className="mt-4 flex items-center">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
        </div>
      </div>
    )
  }

  if (schemaError || !existingSchema || postApprovalSchemaError) {
    return (
      <div className="sm:px-3 md:px-4 px-6 py-2">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
            No Form Builder Available
          </h3>
          <p className="text-yellow-600 dark:text-yellow-400 mb-4">
            The form builder for this program has not been set up yet.
          </p>
          <div className="flex space-x-3">
            <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
            <Button
              onClick={handleViewApplications}
              variant="primary"
              className="flex items-center"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              View Applications
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header with Reviewer Badge */}
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
              {/* Reviewer Access Badge */}
              <div className="flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                <EyeIcon className="w-4 h-4 text-blue-700 dark:text-blue-300 mr-2" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Reviewer Access
                </span>
              </div>

              {/* View Applications Button */}
              <Button
                onClick={handleViewApplications}
                variant="primary"
                className="flex items-center"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                View Applications
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* QuestionBuilder in Read-Only Mode */}
      <div>
        <QuestionBuilder
          initialSchema={existingSchema}
          onSave={undefined} // No save functionality for reviewers
          programId={programId}
          chainId={parsedChainId}
          communityId={communityId}
          readOnly={true} // Enable read-only mode
          initialPostApprovalSchema={existingPostApprovalSchema || undefined}
        />
      </div>
    </div>
  )
}
