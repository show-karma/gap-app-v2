/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getProjectById, isOwnershipTransfered } from "@/utilities/sdk";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";

import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { Button } from "../Utilities/Button";

import { useTransferOwnershipModalStore } from "@/store/modals/transferOwnership";
import { sanitizeInput } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { errorManager } from "../Utilities/errorManager";
import { useWallet } from "@/hooks/useWallet";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";

type TransferOwnershipProps = {
  buttonElement?: {
    text: string;
    icon: ReactNode;
    styleClass: string;
  } | null;
};

export const TransferOwnershipDialog: FC<TransferOwnershipProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
    text: "Transfer Ownership",
    styleClass:
      "flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
  },
}) => {
  const {
    isTransferOwnershipModalOpen: isOpen,
    openTransferOwnershipModal: openModal,
    closeTransferOwnershipModal: closeModal,
  } = useTransferOwnershipModalStore();
  const [newOwner, setNewOwner] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [validAddress, setValidAddress] = useState(true);

  const signer = useSigner();
  const { chain, address } = useAccount();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();

  const transfer = async () => {
    if (!project) return;
    if (!newOwner || !isAddress(newOwner)) {
      toast.error("Please enter a valid address");
      return;
    }
    try {
      setIsLoading(true);
      const { success, chainId: actualChainId } = await ensureCorrectChain({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      const { walletClient, error } = await safeGetWalletClient(
        actualChainId
      );

      if (error || !walletClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) return;
      await fetchedProject
        .transferOwnership(
          walletSigner,
          sanitizeInput(newOwner),
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            const isTransfered = await isOwnershipTransfered(
              walletSigner || signer,
              fetchedProject,
              newOwner as `0x${string}`
            );

            if (isTransfered) {
              setIsProjectOwner(false);
              retries = 0;
              await refreshProject();
              changeStepperStep("indexed");
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          toast.success("Ownership transferred successfully");
        });
      closeModal();
    } catch (error: any) {
      errorManager(
        `Error transferring ownership from ${project.recipient} to ${newOwner}`,
        error,
        {
          project: project?.details?.data?.slug || project?.uid,
          oldOwner: project?.recipient,
          newOwner,
          address: address,
        },
        {
          error: "Failed to transfer ownership.",
        }
      );
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  useEffect(() => {
    if (newOwner?.length) setValidAddress(isAddress(newOwner));
  }, [newOwner]);

  return (
    <>
      {buttonElement ? (
        <Button
          disabled={!isProjectAdmin}
          onClick={openModal}
          className={buttonElement.styleClass}
        >
          {buttonElement.icon}
          {buttonElement.text}
        </Button>
      ) : null}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Transfer Project Ownership
                  </Dialog.Title>
                  <div className="flex flex-col gap-2 mt-8">
                    <label htmlFor="newOwner">New Owner Address</label>
                    <input
                      className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                      type="text"
                      id="newOwner"
                      onChange={(e) => setNewOwner(e.target.value)}
                    />
                    <p className="text-red-500">
                      {!validAddress && newOwner?.length
                        ? `Invalid address. Address should be a hexadecimal string with
                exactly 42 characters.`
                        : null}
                    </p>
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                      onClick={transfer}
                      disabled={isLoading || !validAddress || !newOwner}
                      isLoading={isLoading}
                      type="button"
                    >
                      Continue
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
