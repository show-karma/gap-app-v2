"use client";

import { AlertTriangle, Info } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePostApprovalUpdate } from "@/hooks/useFundingPlatform";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFormSchema, IFundingApplication } from "@/types/funding-platform";
import ApplicationSubmission from "./ApplicationSubmission";

interface EditPostApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: IFundingApplication;
  programId: string;
  postApprovalFormSchema?: IFormSchema;
  onSuccess?: () => void;
}

const EditPostApprovalModal: FC<EditPostApprovalModalProps> = ({
  isOpen,
  onClose,
  application,
  programId,
  postApprovalFormSchema: propFormSchema,
  onSuccess,
}) => {
  const { updatePostApprovalDataAsync, isUpdating } = usePostApprovalUpdate();
  const [formSchema, setFormSchema] = useState<IFormSchema | null>(propFormSchema || null);
  const [isLoadingFormSchema, setIsLoadingFormSchema] = useState(false);
  const [formSchemaError, setFormSchemaError] = useState<string | null>(null);
  const [matchingDiagnostics, setMatchingDiagnostics] = useState<{
    matched: Array<{ fieldLabel: string; originalKey: string; fieldId: string }>;
    unmatched: Array<{ originalKey: string; value: any }>;
    matchRate: number;
  } | null>(null);

  // Fetch post-approval form schema from API when modal opens
  const fetchFormConfig = useCallback(async () => {
    setIsLoadingFormSchema(true);
    setFormSchemaError(null);
    try {
      const program = await fundingPlatformService.programs.getProgramConfiguration(programId);

      if (!program?.applicationConfig?.postApprovalFormSchema) {
        setFormSchemaError("Post-approval form configuration not found");
        setFormSchema(null);
        return;
      }

      setFormSchema(program.applicationConfig.postApprovalFormSchema);
    } catch (error) {
      setFormSchemaError("Failed to load form configuration");
      setFormSchema(null);
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch post-approval form config:", error);
      }
    } finally {
      setIsLoadingFormSchema(false);
    }
  }, [programId]);

  useEffect(() => {
    if (isOpen && programId) {
      if (propFormSchema) {
        setFormSchema(propFormSchema);
        setFormSchemaError(null);
      } else {
        fetchFormConfig();
      }
    }
  }, [isOpen, programId, propFormSchema, fetchFormConfig]);

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  const handleSubmit = async (postApprovalData: Record<string, unknown>) => {
    try {
      await updatePostApprovalDataAsync({
        applicationId: application.referenceNumber || application.id,
        postApprovalData: postApprovalData as Record<string, any>,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update post-approval data:", error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-8">
        <DialogHeader className="pb-4">
          <DialogTitle>Edit Post-Approval Data</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6">
          {/* Admin edit mode info banner */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Admin Edit Mode
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You are editing the post-approval data on behalf of the applicant.
                </p>
              </div>
            </div>
          </div>

          {/* Warning banner for low match rate */}
          {matchingDiagnostics && matchingDiagnostics.matchRate < 0.7 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Some fields could not be matched
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                    {matchingDiagnostics.unmatched.length} field(s) from the original submission
                    could not be matched to the current form schema. These fields may appear empty
                    even if they had values originally. Unmatched data will be preserved on save.
                  </p>
                  {matchingDiagnostics.unmatched.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-yellow-800 dark:text-yellow-200 cursor-pointer hover:underline">
                        View unmatched fields ({matchingDiagnostics.unmatched.length})
                      </summary>
                      <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                        {matchingDiagnostics.unmatched.map(({ originalKey }) => (
                          <li key={originalKey}>{originalKey}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLoadingFormSchema ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Loading form configuration...
              </p>
            </div>
          ) : formSchemaError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-4">
                {formSchemaError}
              </p>
              <Button onClick={fetchFormConfig} variant="primary">
                Retry
              </Button>
            </div>
          ) : formSchema ? (
            <ApplicationSubmission
              programId={programId}
              formSchema={formSchema}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={isUpdating}
              initialData={application.postApprovalData}
              isEditMode={true}
              onMatchingDiagnostics={setMatchingDiagnostics}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No post-approval form configuration available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostApprovalModal;
