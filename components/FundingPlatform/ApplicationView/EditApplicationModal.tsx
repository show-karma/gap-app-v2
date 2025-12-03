"use client";

import { type FC, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApplicationUpdateV2 } from "@/hooks/useFundingPlatform";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFormSchema, IFundingApplication } from "@/types/funding-platform";
import ApplicationSubmission from "./ApplicationSubmission";

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: IFundingApplication;
  programId: string;
  chainId: number;
  formSchema?: IFormSchema; // Optional - modal will fetch if not provided
  onSuccess?: () => void;
}

const EditApplicationModal: FC<EditApplicationModalProps> = ({
  isOpen,
  onClose,
  application,
  programId,
  chainId,
  formSchema: propFormSchema,
  onSuccess,
}) => {
  const { updateApplication, isUpdating } = useApplicationUpdateV2();
  const [formSchema, setFormSchema] = useState<IFormSchema | null>(propFormSchema || null);
  const [isLoadingFormSchema, setIsLoadingFormSchema] = useState(false);
  const [formSchemaError, setFormSchemaError] = useState<string | null>(null);

  // Fetch formconfig from API when modal opens (if not provided as prop)
  const fetchFormConfig = useCallback(async () => {
    setIsLoadingFormSchema(true);
    setFormSchemaError(null);
    try {
      const program = await fundingPlatformService.programs.getProgramConfiguration(
        programId,
        chainId
      );

      if (!program?.applicationConfig?.formSchema) {
        setFormSchemaError("Form configuration not found");
        setFormSchema(null);
        return;
      }

      setFormSchema(program.applicationConfig.formSchema);
    } catch (error) {
      setFormSchemaError("Failed to load form configuration");
      setFormSchema(null);
      console.error("Failed to fetch formconfig:", error);
    } finally {
      setIsLoadingFormSchema(false);
    }
  }, [programId, chainId]);

  useEffect(() => {
    if (isOpen && programId && chainId) {
      if (propFormSchema) {
        // Use provided formSchema if available
        setFormSchema(propFormSchema);
        setFormSchemaError(null);
      } else {
        // Fetch formconfig from API
        fetchFormConfig();
      }
    }
  }, [isOpen, programId, chainId, propFormSchema, fetchFormConfig]);

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  const handleSubmit = async (applicationData: Record<string, unknown>) => {
    try {
      await updateApplication({
        applicationId: application.referenceNumber || application.id,
        // biome-ignore lint/suspicious/noExplicitAny: ApplicationSubmission interface uses Record<string, any>
        applicationData: applicationData as Record<string, any>,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      // Error is handled by the hook (shows toast with specific message)
      // Modal stays open to allow user to retry or cancel
      console.error("Failed to update application:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
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
              chainId={chainId}
              formSchema={formSchema}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={isUpdating}
              initialData={application.applicationData}
              isEditMode={true}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No form configuration available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditApplicationModal;
