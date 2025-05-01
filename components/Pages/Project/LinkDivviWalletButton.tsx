"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { Dialog, Transition } from "@headlessui/react";
import { WalletIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { Fragment, useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface LinkDivviWalletButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
}

// Regex pattern for Ethereum addresses
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const LinkDivviWalletButton: FC<LinkDivviWalletButtonProps> = ({
  project,
  buttonClassName,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;

  const [isOpen, setIsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.external?.divvi_wallets?.length) {
      setWalletAddress(project.external.divvi_wallets[0]);
    } else {
      setWalletAddress("");
    }
  }, [project?.external?.divvi_wallets]);

  const handleWalletChange = useCallback((value: string) => {
    setWalletAddress(value);
    setValidationError(null);
  }, []);

  const validateWalletAddress = useCallback((address: string): boolean => {
    if (!address) return true; // Empty is valid (for removing a wallet)

    if (!ETH_ADDRESS_REGEX.test(address)) {
      setValidationError(
        "Please enter a valid Ethereum wallet address (0x followed by 40 hexadecimal characters)"
      );
      return false;
    }

    return true;
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setValidationError(null);

    // Validate wallet address
    if (!validateWalletAddress(walletAddress)) {
      return;
    }

    setIsLoading(true);
    try {
      const ids = walletAddress.trim() ? [walletAddress.trim()] : [];

      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "divvi_wallets",
          ids: ids,
        }
      );

      if (data) {
        toast.success("Divvi wallet address successfully linked to project");
      }

      if (error) {
        setError("Failed to link Divvi wallet address.");
        throw new Error("Failed to link Divvi wallet address");
      }
    } catch (err) {
      setError("Failed to link Divvi wallet address.");
      errorManager(
        "Failed to link Divvi wallet address.",
        err,
        { projectUID: project.uid },
        { error: "Failed to link Divvi wallet address." }
      );
    } finally {
      setIsLoading(false);
    }
  }, [project.uid, walletAddress, validateWalletAddress]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={buttonClassName}>
        <WalletIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
        Link Divvi Wallet
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsOpen(false)}
        >
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      Link Divvi Entity Wallet Address
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Add a Divvi wallet address for the project. This will
                      enable the project to integrate with Divvi functionality.
                    </p>
                  </Dialog.Title>
                  <div className="mt-8">
                    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg w-full">
                      <div className="flex items-center space-x-4 w-full">
                        <span className="text-md font-bold capitalize whitespace-nowrap">
                          Wallet Address
                        </span>
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => handleWalletChange(e.target.value)}
                          className="text-sm rounded-md w-full text-gray-900 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                          placeholder="Enter Divvi wallet address (0x...)"
                        />
                      </div>
                    </div>
                    {validationError && (
                      <p className="text-red-500 mt-2 text-sm">
                        {validationError}
                      </p>
                    )}
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="bg-primary-500 text-lg text-white hover:bg-primary-600"
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent hover:text-black disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={() => setIsOpen(false)}
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
    </>
  );
};
