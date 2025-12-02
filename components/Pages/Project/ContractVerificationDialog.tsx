"use client";

import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { useContractVerification, VerificationStep } from "@/hooks/useContractVerification";

// Utility function to mask wallet address
const maskAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface ContractVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  network: string;
  contractAddress: string;
  projectUid: string;
  onSuccess?: (result: { verified: boolean; verifiedAt?: string; verifiedBy?: string }) => void | Promise<void>;
}

export const ContractVerificationDialog: React.FC<ContractVerificationDialogProps> = ({
  isOpen,
  onClose,
  network,
  contractAddress,
  projectUid,
  onSuccess,
}) => {
  const { address: currentWalletAddress } = useAccount();
  const { step, deployerInfo, error, needsWalletSwitch, verifyContract, reset } =
    useContractVerification();
  const autoRetryAttemptedRef = useRef(false);

  const handleVerify = async () => {
    const result = await verifyContract(network, contractAddress, projectUid);
    if (result && onSuccess) {
      await onSuccess({
        verified: result.verified,
        verifiedAt: result.contract.verifiedAt,
        verifiedBy: result.contract.verifiedBy,
      });
    }
  };

  const handleClose = () => {
    reset();
    autoRetryAttemptedRef.current = false;
    onClose();
  };

  // Auto-detect wallet changes and retry verification if correct wallet is connected
  useEffect(() => {
    if (
      needsWalletSwitch &&
      deployerInfo &&
      currentWalletAddress &&
      !autoRetryAttemptedRef.current
    ) {
      // Check if the user switched to the correct wallet
      const isCorrectWallet =
        currentWalletAddress.toLowerCase() === deployerInfo.deployerAddress.toLowerCase();

      if (isCorrectWallet) {
        // Mark that we've attempted auto-retry to prevent infinite loops
        autoRetryAttemptedRef.current = true;
        // Automatically retry verification with the correct wallet
        handleVerify();
      }
    }
  }, [currentWalletAddress, needsWalletSwitch, deployerInfo]);

  // Reset auto-retry flag when dialog closes or step changes
  useEffect(() => {
    if (step === VerificationStep.IDLE || step === VerificationStep.SUCCESS) {
      autoRetryAttemptedRef.current = false;
    }
  }, [step]);

  const getStepMessage = () => {
    switch (step) {
      case VerificationStep.LOOKING_UP_DEPLOYER:
        return "Step 1 of 4: Looking up contract deployer...";
      case VerificationStep.CHECKING_WALLET:
        return "Step 2 of 4: Checking wallet connection...";
      case VerificationStep.GENERATING_MESSAGE:
        return "Step 2 of 4: Generating verification message...";
      case VerificationStep.WAITING_FOR_SIGNATURE:
        return "Step 3 of 4: Waiting for signature...";
      case VerificationStep.VERIFYING_SIGNATURE:
        return "Step 4 of 4: Verifying signature...";
      case VerificationStep.SUCCESS:
        return "Contract verified successfully!";
      case VerificationStep.ERROR:
        return "Verification failed";
      default:
        return "Ready to verify contract ownership";
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case VerificationStep.LOOKING_UP_DEPLOYER:
        return 25;
      case VerificationStep.CHECKING_WALLET:
      case VerificationStep.GENERATING_MESSAGE:
        return 50;
      case VerificationStep.WAITING_FOR_SIGNATURE:
        return 75;
      case VerificationStep.VERIFYING_SIGNATURE:
        return 90;
      case VerificationStep.SUCCESS:
        return 100;
      default:
        return 0;
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
                        <span className="font-medium">Contract:</span> {contractAddress}
                      </p>
                      {deployerInfo && (
                        <p className="text-gray-600 dark:text-gray-300 mt-2">
                          <span className="font-medium">Deployer:</span>{" "}
                          <span className="font-mono">{maskAddress(deployerInfo.deployerAddress)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isLoading && (
                    <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getStepProgress()}%` }}
                      />
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="flex items-center space-x-2">
                    {step === VerificationStep.SUCCESS ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : step === VerificationStep.ERROR ? (
                      <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                    ) : isLoading ? (
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : null}
                    <p className="text-sm text-gray-700 dark:text-gray-200">{getStepMessage()}</p>
                  </div>

                  {/* Error Message - Don't show if it's just a wallet switch warning */}
                  {error && !needsWalletSwitch && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Wallet Switch Warning */}
                  {needsWalletSwitch && deployerInfo && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                        Log in with contract deployer wallet to proceed
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-mono mb-2">
                        {maskAddress(deployerInfo.deployerAddress)}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 italic">
                        Verification will continue automatically once you switch wallets
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
                        <li>We&apos;ll look up who deployed this contract</li>
                        <li>You&apos;ll need to switch to the deployer wallet if needed</li>
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
                        <Button onClick={handleVerify} disabled={isLoading || needsWalletSwitch}>
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
