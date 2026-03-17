"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useRef } from "react";
import { Button } from "@/components/Utilities/Button";
import type { PayoutGrantConfig } from "../types/payout-disbursement";
import {
  PayoutConfigurationContent,
  type PayoutConfigurationContentRef,
} from "./PayoutConfigurationContent";

export interface PayoutConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  projectUID: string;
  communityUID: string;
  grantName: string;
  projectName: string;
  /** Existing config if editing */
  existingConfig?: PayoutGrantConfig | null;
  onSuccess?: () => void;
}

export function PayoutConfigurationModal({
  isOpen,
  onClose,
  grantUID,
  projectUID,
  communityUID,
  grantName,
  projectName,
  existingConfig,
  onSuccess,
}: PayoutConfigurationModalProps) {
  const contentRef = useRef<PayoutConfigurationContentRef>(null);

  const handleSave = async () => {
    await contentRef.current?.save();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white"
                    >
                      Configure Payout
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {projectName.length > 50 ? `${projectName.slice(0, 50)}...` : projectName} -{" "}
                      {grantName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close payout configuration"
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <PayoutConfigurationContent
                  ref={contentRef}
                  isActive={isOpen}
                  grantUID={grantUID}
                  projectUID={projectUID}
                  communityUID={communityUID}
                  grantName={grantName}
                  projectName={projectName}
                  existingConfig={existingConfig}
                  onSuccess={() => {
                    onSuccess?.();
                    onClose();
                  }}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-600 mt-6">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Configuration</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
