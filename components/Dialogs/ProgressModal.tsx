"use client";

import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";
import { useProgressModal } from "@/store/modals/progressModal";

export const ProgressModal = () => {
  const { isOpen, status, message, close } = useProgressModal();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[150]" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-8 text-center align-middle transition-all shadow-xl">
                <div className="flex flex-col items-center gap-4">
                  {status === "loading" && (
                    <>
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
                      <p className="text-lg font-medium dark:text-zinc-100 text-gray-900">
                        {message}
                      </p>
                    </>
                  )}

                  {status === "success" && (
                    <>
                      <div className="flex items-center justify-center">
                        <CheckCircleIcon className="h-14 w-14 text-green-500" />
                      </div>
                      <p className="text-lg font-medium dark:text-zinc-100 text-gray-900">
                        {message}
                      </p>
                    </>
                  )}

                  {status === "error" && (
                    <>
                      <div className="flex items-center justify-center">
                        <XCircleIcon className="h-14 w-14 text-red-500" />
                      </div>
                      <p className="text-lg font-medium dark:text-zinc-100 text-gray-900">
                        {message}
                      </p>
                      <button
                        type="button"
                        onClick={close}
                        className="mt-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
