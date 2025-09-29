import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { getProjectMemberRoles } from "@/utilities/getProjectMemberRoles";
import { INDEXER } from "@/utilities/indexer";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { Dialog, Transition } from "@headlessui/react";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
import * as Tooltip from "@radix-ui/react-tooltip";
import { FC, Fragment, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useWallet } from "@/hooks/useWallet";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";

interface DemoteMemberDialogProps {
  memberAddress: string;
}

export const DemoteMemberDialog: FC<DemoteMemberDialogProps> = ({
  memberAddress,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDemoting, setIsDemoting] = useState(false);
  const { gap } = useGap();
  const { address, chain } = useAccount();
  const { project } = useProjectStore();
  const { teamProfiles } = useTeamProfiles(project);
  const { changeStepperStep, setIsStepper } = useStepper();
  const { switchChainAsync } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const demoteMember = async () => {
    if (!address || !project) return;
    try {
      setIsDemoting(true);
      setIsStepper(true);
      const { success, chainId: actualChainId, gapClient } = await ensureCorrectChain({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsDemoting(false);
        return;
      }

      const { walletClient, error } = await safeGetWalletClient(
        actualChainId
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) throw new Error("Project not found");

      const member = fetchedProject.members.find(
        (item) => item.recipient.toLowerCase() === memberAddress.toLowerCase()
      );
      if (!member) throw new Error("Member not found");

      const projectInstance = await gapClient.fetch.projectById(project.uid);

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const memberRoles = await getProjectMemberRoles(
              project,
              projectInstance
            );
            const isAdmin =
              memberRoles[memberAddress.toLowerCase()] !== "Admin";

            return isAdmin;
          },
          async () => {
            callbackFn?.();
          }
        );
      };

      await projectInstance
        .removeAdmin(
          walletSigner as any,
          memberAddress.toLowerCase(),
          changeStepperStep
        )
        .then(async (res) => {
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, projectInstance.chainID),
              "POST",
              {}
            );
          }
          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
          }).then(async () => {
            toast.success("Member removed as admin successfully");
            closeModal();
            await refreshProject();
            queryClient.invalidateQueries({
              queryKey: ["memberRoles", project?.uid],
            });
          });
        });
    } catch (error) {
      errorManager(
        "Error removing member as admin",
        error,
        {
          address,
          memberAddress,
          projectUid: project?.uid,
        },
        {
          error: `Failed to remove member ${memberAddress} as admin.`,
        }
      );
      console.log(error);
    } finally {
      setIsDemoting(false);
      setIsStepper(false);
    }
  };

  const profile = teamProfiles?.find(
    (profile) => profile.recipient.toLowerCase() === memberAddress.toLowerCase()
  );

  return (
    <>
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <div>
              <Button
                onClick={openModal}
                className={
                  "flex items-center gap-x-1 rounded-md bg-transparent dark:bg-transparent p-2 text-base font-semibold text-white dark:text-zinc-100  hover:bg-transparent dark:hover:bg-transparent hover:opacity-80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-center justify-center"
                }
              >
                <ShieldExclamationIcon className="w-4 h-4 text-black dark:text-zinc-100" />
              </Button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
              sideOffset={5}
              side="top"
            >
              <p>Remove member as admin</p>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-900 bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Remove member as admin
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      Are you sure you want to remove{" "}
                      {profile?.data.name || memberAddress} as admin?
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      onClick={closeModal}
                      className="text-zinc-900 text-base bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={demoteMember}
                      disabled={isDemoting}
                      className="text-zinc-100 text-base bg-brand-blue dark:text-zinc-100 dark:border-zinc-100 hover:bg-brand-blue/90 dark:hover:bg-brand-blue/90 dark:hover:text-white"
                    >
                      {isDemoting ? "Removing..." : "Confirm"}
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
