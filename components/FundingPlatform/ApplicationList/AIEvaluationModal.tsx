"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { type FC, Fragment } from "react";
import { AIEvaluationDisplay } from "../ApplicationView/AIEvaluation";
import { InternalAIEvaluationDisplay } from "../ApplicationView/InternalAIEvaluation";

export type EvaluationType = "external" | "internal";

interface AIEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationType: EvaluationType;
  evaluation: string | null | undefined;
  projectTitle?: string;
}

export const AIEvaluationModal: FC<AIEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluationType,
  evaluation,
  projectTitle,
}) => {
  const title = evaluationType === "external" ? "AI Evaluation" : "Internal AI Evaluation";

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                  >
                    {title}
                  </Dialog.Title>
                  {projectTitle && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{projectTitle}</p>
                  )}
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  {evaluationType === "external" ? (
                    <AIEvaluationDisplay
                      evaluation={evaluation ?? null}
                      isLoading={false}
                      isEnabled={true}
                    />
                  ) : (
                    <InternalAIEvaluationDisplay evaluation={evaluation ?? null} />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
