import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getProjectById } from "@/utilities/sdk";
import { Dialog, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import dynamic from "next/dynamic";
import { FC, Fragment, useState } from "react";
import toast from "react-hot-toast";

import { useWallet } from "@/hooks/useWallet";

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

interface DeleteMemberDialogProps {
  memberAddress: string;
}

export const DeleteMemberDialog: FC<DeleteMemberDialogProps> = ({
  memberAddress,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  let [isOpen, setIsOpen] = useState(false);
  const { gap } = useGap();
  const { project } = useProjectStore();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { address, chain, switchChainAsync, getSigner } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const deleteMember = async () => {
    // await deleteMemberFromProject(memberAddress);
    let gapClient = gap;
    if (!address || !project) return;
    try {
      setIsDeleting(true);
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      if (!gapClient) {
        throw new Error("Failed to get gap client");
      }
      const walletSigner = await getSigner(project.chainID);
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) throw new Error("Project not found");
      const member = fetchedProject.members.find(
        (item) => item.recipient.toLowerCase() === memberAddress.toLowerCase()
      );
      if (!member) throw new Error("Member not found");
      await member
        .revoke(walletSigner as any, changeStepperStep)
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
            await refreshProject().then(async (refreshedProject) => {
              const currentMember = refreshedProject?.members.find(
                (item) =>
                  item.recipient.toLowerCase() === memberAddress.toLowerCase()
              );
              if (!currentMember) {
                retries = 0;
                changeStepperStep("indexed");
                toast.success("Member removed successfully");
                closeModal();
              }
            });

            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      errorManager(
        `Error removing member ${memberAddress}`,
        error,
        {
          project: project?.details?.data?.slug || project?.uid,
          member: memberAddress,
          address: address,
        },
        {
          error: `Failed to remove member ${memberAddress}.`,
        }
      );
    } finally {
      setIsDeleting(false);
      setIsStepper(false);
    }
  };

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <div>
              <Button
                onClick={openModal}
                className={
                  "flex justify-center items-center gap-x-1 rounded-md bg-transparent p-2 text-sm font-semibold text-red-600 dark:text-red-300  hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-white"
                }
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
              sideOffset={5}
              side="top"
            >
              <p>Remove member from team</p>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      {isOpen ? (
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
                      Are you sure you want to remove {memberAddress} from the
                      project?
                    </Dialog.Title>
                    <div className="flex flex-row gap-4 mt-10 justify-end">
                      <Button
                        className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                        onClick={closeModal}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                        onClick={deleteMember}
                        disabled={isDeleting}
                        isLoading={isDeleting}
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
      ) : null}
    </>
  );
};
