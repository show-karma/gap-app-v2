"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Fragment } from "react";
import { useOnrampStatusModalStore } from "@/store/modals/onrampStatus";
import { Button } from "../Utilities/Button";
import { Spinner } from "../Utilities/Spinner";

const statusConfig = {
  success: {
    icon: CheckCircleIcon,
    color: "text-green-500",
    title: "Payment Successful!",
    description: "Your crypto purchase was completed successfully.",
  },
  pending: {
    icon: ClockIcon,
    color: "text-yellow-500",
    title: "Payment Processing",
    description: "Your payment is being processed. This usually takes a few minutes.",
  },
  failed: {
    icon: ExclamationCircleIcon,
    color: "text-red-500",
    title: "Payment Failed",
    description: "Your payment could not be completed. Please try again.",
  },
  NOT_FOUND: {
    icon: QuestionMarkCircleIcon,
    color: "text-gray-500",
    title: "Transaction Not Found",
    description: "We couldn't find a transaction with this reference.",
  },
  unknown: {
    icon: QuestionMarkCircleIcon,
    color: "text-gray-500",
    title: "Status Unknown",
    description: "Unable to determine the transaction status.",
  },
};

export const OnrampStatusDialog = () => {
  const { isOpen, isLoading, transaction, error, closeModal } = useOnrampStatusModalStore();

  const config = transaction ? statusConfig[transaction.status] : statusConfig.unknown;
  const StatusIcon = config.icon;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Card Payment Status
                  </Dialog.Title>
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center py-8 gap-4">
                  {isLoading ? (
                    <>
                      <Spinner />
                      <p className="text-gray-600 dark:text-zinc-300">Checking payment status...</p>
                    </>
                  ) : error ? (
                    <>
                      <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
                      <p className="text-gray-600 dark:text-zinc-300">{error}</p>
                    </>
                  ) : transaction ? (
                    <>
                      <StatusIcon className={`h-12 w-12 ${config.color}`} />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                        {config.title}
                      </h3>
                      <p className="text-center text-gray-600 dark:text-zinc-300">
                        {config.description}
                      </p>

                      {transaction.status === "success" && (
                        <div className="w-full mt-4 p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                          <div className="flex flex-col gap-2 text-sm">
                            {transaction.purchaseAmount && transaction.purchaseCurrency && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-zinc-400">Purchased:</span>
                                <span className="font-medium text-gray-900 dark:text-zinc-100">
                                  {transaction.purchaseAmount} {transaction.purchaseCurrency}
                                </span>
                              </div>
                            )}
                            {transaction.paymentTotal && transaction.paymentCurrency && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-zinc-400">
                                  Total Paid:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-zinc-100">
                                  {transaction.paymentTotal} {transaction.paymentCurrency}
                                </span>
                              </div>
                            )}
                            {transaction.txHash && (
                              <div className="flex flex-col gap-1 mt-2">
                                <span className="text-gray-500 dark:text-zinc-400">
                                  Transaction Hash:
                                </span>
                                <span className="font-mono text-xs text-gray-700 dark:text-zinc-300 break-all">
                                  {transaction.txHash}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={closeModal}
                    className="w-full bg-brand-blue text-white hover:bg-blue-600 px-6 py-2.5 rounded-lg"
                  >
                    Close
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
