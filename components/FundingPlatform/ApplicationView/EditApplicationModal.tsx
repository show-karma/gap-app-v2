"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { type FC, Fragment, useEffect, useState } from "react";
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
  }, [isOpen, programId, chainId, propFormSchema]);

  const fetchFormConfig = async () => {
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
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  const handleSubmit = async (applicationData: Record<string, any>) => {
    try {
      await updateApplication({
        applicationId: application.referenceNumber || application.id,
        applicationData,
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
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-zinc-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={handleClose}
                    disabled={isUpdating}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white mb-4"
                    >
                      Edit Application
                    </Dialog.Title>
                    <div className="mt-2 max-h-[70vh] overflow-y-auto">
                      {isLoadingFormSchema ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-gray-600 dark:text-gray-400">
                            Loading form configuration...
                          </div>
                        </div>
                      ) : formSchemaError ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <p className="text-red-600 dark:text-red-400 mb-4">{formSchemaError}</p>
                          <button
                            type="button"
                            onClick={fetchFormConfig}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Retry
                          </button>
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
                        <div className="flex items-center justify-center py-8">
                          <div className="text-gray-600 dark:text-gray-400">
                            No form configuration available
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default EditApplicationModal;
