"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Utilities/Spinner";
import { useContractVerification } from "@/hooks/useContractVerification";

interface ContractVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  network: string;
  chainId: number;
  projectId: string;
  onSuccess: (address: string) => void;
}

export const ContractVerificationModal: React.FC<ContractVerificationModalProps> = ({
  isOpen,
  onClose,
  contractAddress,
  network,
  chainId,
  projectId,
  onSuccess,
}) => {
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const { verifyContract, isVerifying } = useContractVerification();

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleVerification = async () => {
    setVerificationStatus("idle");
    setErrorMessage("");

    const result = await verifyContract(projectId, contractAddress, chainId, network);

    if (result.success) {
      setVerificationStatus("success");
      toast.success("Contract verified successfully!");
      onSuccess(contractAddress);
      setTimeout(() => {
        onClose();
        setVerificationStatus("idle");
      }, 2000);
    } else {
      setVerificationStatus("error");
      
      // Set user-friendly error messages
      const error = result.error || "Verification failed";
      if (error.includes("cancelled")) {
        setErrorMessage("Signature request was cancelled");
      } else if (error.includes("not the owner") || error.includes("unauthorized")) {
        setErrorMessage("You are not the owner of this contract. Please connect the wallet that deployed this contract.");
      } else if (error.includes("not found")) {
        setErrorMessage("Contract not found on the specified network");
      } else {
        setErrorMessage(error);
      }
    }
  };

  const handleClose = () => {
    if (!isVerifying) {
      onClose();
      setVerificationStatus("idle");
      setErrorMessage("");
    }
  };

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
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-gray-900 dark:text-zinc-100"
                >
                  Verify Contract Ownership
                </Dialog.Title>

                <div className="mt-4">
                  {verificationStatus === "idle" && (
                    <>
                      <div className="space-y-3">
                        <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Contract</p>
                          <p className="font-mono text-sm font-semibold text-gray-900 dark:text-zinc-100">
                            {formatAddress(contractAddress)}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Network</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 capitalize">
                            {network}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        Sign a message with your wallet to prove you own this contract. 
                        Make sure you&apos;re connected with the wallet that deployed this contract.
                      </p>
                    </>
                  )}

                  {verificationStatus === "success" && (
                    <div className="flex flex-col items-center py-8">
                      <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                        Contract Verified!
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Your contract has been successfully verified.
                      </p>
                    </div>
                  )}

                  {verificationStatus === "error" && (
                    <div className="flex flex-col items-center py-4">
                      <ExclamationCircleIcon className="h-16 w-16 text-red-500 mb-4" />
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                        Verification Failed
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
                        {errorMessage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {verificationStatus === "idle" && (
                    <>
                      <Button
                        onClick={handleClose}
                        disabled={isVerifying}
                        className="bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 hover:bg-gray-300 dark:hover:bg-zinc-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleVerification}
                        disabled={isVerifying}
                        className="bg-primary-500 text-white hover:bg-primary-600 flex items-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            Verifying...
                          </>
                        ) : (
                          "Sign Message"
                        )}
                      </Button>
                    </>
                  )}

                  {verificationStatus === "error" && (
                    <>
                      <Button
                        onClick={handleClose}
                        className="bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 hover:bg-gray-300 dark:hover:bg-zinc-600"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={handleVerification}
                        className="bg-primary-500 text-white hover:bg-primary-600"
                      >
                        Try Again
                      </Button>
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