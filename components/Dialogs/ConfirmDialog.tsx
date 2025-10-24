"use client";
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  const getIconColor = () => {
    switch (type) {
      case "danger":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-red-600 dark:text-red-400";
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "danger":
        return "bg-red-100 dark:bg-red-900/20";
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900/20";
      case "info":
        return "bg-blue-100 dark:bg-blue-900/20";
      default:
        return "bg-red-100 dark:bg-red-900/20";
    }
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
          <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="sm:flex sm:items-start">
                  <div
                    className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getBgColor()} sm:mx-0 sm:h-10 sm:w-10`}
                  >
                    <ExclamationTriangleIcon
                      className={`h-6 w-6 ${getIconColor()}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {message}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                  <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    variant={type === "danger" ? "primary" : "secondary"}
                    className={
                      type === "danger"
                        ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                        : ""
                    }
                  >
                    {isLoading ? "Processing..." : confirmText}
                  </Button>
                  <Button
                    onClick={onClose}
                    disabled={isLoading}
                    variant="secondary"
                  >
                    {cancelText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
