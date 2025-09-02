"use client";

import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  status: string;
  isSubmitting?: boolean;
  isReasonRequired?: boolean;
}

const statusLabels: Record<string, string> = {
  revision_requested: "Request Revision",
  approved: "Approve",
  rejected: "Reject",
  pending: "Set as Pending",
};

const statusDescriptions: Record<string, string> = {
  revision_requested: "Request the applicant to revise their application",
  approved: "Approve this application",
  rejected: "Reject this application",
  pending: "Set this application back to pending",
};

const StatusChangeModal: FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  status,
  isSubmitting = false,
  isReasonRequired = false,
}) => {
  const [reason, setReason] = useState("");
  
  // Make reason required for revision_requested and rejected statuses
  const isReasonActuallyRequired = isReasonRequired || status === 'revision_requested' || status === 'rejected';

  const handleConfirm = () => {
    // If reason is required but not provided, don't proceed
    if (isReasonActuallyRequired && !reason.trim()) {
      return;
    }
    onConfirm(reason || undefined);
    setReason("");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onClose();
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${status === 'approved' ? 'bg-green-100 dark:bg-green-900' :
                    status === 'rejected' ? 'bg-red-100 dark:bg-red-900' :
                      'bg-yellow-100 dark:bg-yellow-900'
                    } sm:mx-0 sm:h-10 sm:w-10`}>
                    <ExclamationTriangleIcon className={`h-6 w-6 ${status === 'approved' ? 'text-green-600 dark:text-green-400' :
                      status === 'rejected' ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`} aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      {statusLabels[status] || "Change Status"}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {statusDescriptions[status] || "Change the status of this application."}
                      </p>

                      <div className="mt-4">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reason {isReasonActuallyRequired ? <span className="text-red-500">*</span> : "(Optional)"}
                        </label>
                        <textarea
                          id="reason"
                          name="reason"
                          rows={4}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                          placeholder={
                            status === 'revision_requested'
                              ? "Explain what needs to be revised..."
                              : status === 'rejected'
                                ? "Explain why the application is rejected..."
                                : "Add any notes about this decision..."
                          }
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {status === 'revision_requested'
                            ? "The applicant will see this message and can update their application."
                            : status === 'rejected' 
                              ? "This reason will be recorded and may be shared with the applicant."
                              : "This reason will be recorded in the status history."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    onClick={handleConfirm}
                    disabled={isSubmitting || (isReasonActuallyRequired && !reason.trim())}
                    className={`w-full sm:w-auto sm:ml-3 ${status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                      status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                        ''
                      }`}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default StatusChangeModal;