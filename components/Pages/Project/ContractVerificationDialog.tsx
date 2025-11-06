"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import {
  useContractVerification,
  VerificationStep,
} from "@/hooks/useContractVerification";

interface ContractVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  network: string;
  contractAddress: string;
  projectUid: string;
  onSuccess?: () => void | Promise<void>;
}

export const ContractVerificationDialog: React.FC<
  ContractVerificationDialogProps
> = ({ isOpen, onClose, network, contractAddress, projectUid, onSuccess }) => {
  const { step, deployerInfo, error, needsWalletSwitch, verifyContract, reset } =
    useContractVerification();

  const handleVerify = async () => {
    const result = await verifyContract(network, contractAddress, projectUid);
    if (result && onSuccess) {
      await onSuccess();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getStepMessage = () => {
    switch (step) {
      case VerificationStep.LOOKING_UP_DEPLOYER:
        return "Looking up contract deployer...";
      case VerificationStep.CHECKING_WALLET:
        return "Checking wallet connection...";
      case VerificationStep.GENERATING_MESSAGE:
        return "Generating verification message...";
      case VerificationStep.WAITING_FOR_SIGNATURE:
        return "Waiting for signature...";
      case VerificationStep.VERIFYING_SIGNATURE:
        return "Verifying signature...";
      case VerificationStep.SUCCESS:
        return "Contract verified successfully!";
      case VerificationStep.ERROR:
        return "Verification failed";
      default:
        return "Ready to verify contract ownership";
    }
  };

  const isLoading =
    step !== VerificationStep.IDLE &&
    step !== VerificationStep.SUCCESS &&
    step !== VerificationStep.ERROR;

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Verify Contract Ownership
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Contract Info */}
                  <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-lg">
                    <div className="text-sm">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        <span className="font-medium">Network:</span>{" "}
                        <span className="capitalize">{network}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 break-all">
                        <span className="font-medium">Contract:</span>{" "}
                        {contractAddress}
                      </p>
                      {deployerInfo && (
                        <p className="text-gray-600 dark:text-gray-300 break-all mt-2">
                          <span className="font-medium">Deployer:</span>{" "}
                          {deployerInfo.deployerAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="flex items-center space-x-2">
                    {step === VerificationStep.SUCCESS ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : step === VerificationStep.ERROR ? (
                      <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                    ) : isLoading ? (
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : null}
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {getStepMessage()}
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Wallet Switch Warning */}
                  {needsWalletSwitch && deployerInfo && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Please switch to the deployer wallet to continue:
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-mono mt-1 break-all">
                        {deployerInfo.deployerAddress}
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  {step === VerificationStep.IDLE && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        <strong>How it works:</strong>
                      </p>
                      <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                        <li>We'll look up who deployed this contract</li>
                        <li>
                          You'll need to switch to the deployer wallet if needed
                        </li>
                        <li>Sign a message to prove you own the deployer wallet</li>
                        <li>Once verified, the contract will be marked as verified</li>
                      </ol>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 mt-6">
                    {step === VerificationStep.SUCCESS ? (
                      <Button onClick={handleClose}>Close</Button>
                    ) : (
                      <>
                        <Button
                          onClick={handleClose}
                          disabled={isLoading}
                          className="bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVerify}
                          disabled={isLoading || needsWalletSwitch}
                        >
                          {isLoading ? "Verifying..." : "Start Verification"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
