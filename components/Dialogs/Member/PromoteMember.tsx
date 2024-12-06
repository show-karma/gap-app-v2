import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { queryClient } from "@/components/Utilities/WagmiProvider";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { getProjectById } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";
import { Dialog, Transition } from "@headlessui/react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";
import { getWalletClient } from "@wagmi/core";
import { FC, Fragment, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

interface PromoteMemberDialogProps {
  memberAddress: string;
}

export const PromoteMemberDialog: FC<PromoteMemberDialogProps> = ({
  memberAddress,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const { gap } = useGap();
  const { address, chain } = useAccount();
  const { project, teamProfiles } = useProjectStore();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const promoteMember = async () => {
    if (!address || !project) return;
    try {
      setIsPromoting(true);
      setIsStepper(true);
      let gapClient = gap;

      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient || !gapClient) return;

      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) throw new Error("Project not found");

      const member = fetchedProject.members.find(
        (item) => item.recipient.toLowerCase() === memberAddress.toLowerCase()
      );
      if (!member) throw new Error("Member not found");

      const projectInstance = await gapClient.fetch.projectById(project.uid);

      await projectInstance.addAdmin(
        walletSigner as any,
        memberAddress.toLowerCase(),
        changeStepperStep
      );
      await refreshProject();
      toast.success("Member promoted successfully");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["memberRoles", project?.uid] });
    } catch (error) {
      errorManager("Error promoting member", error);
      toast.error("Failed to promote member");
      console.log(error);
    } finally {
      setIsPromoting(false);
      setIsStepper(false);
    }
  };

  const profile = teamProfiles?.find(
    (profile) => profile.recipient.toLowerCase() === memberAddress.toLowerCase()
  );

  return (
    <>
      <Button
        onClick={openModal}
        className={
          "flex items-center gap-x-1 rounded-md bg-transparent dark:bg-transparent p-2 text-base font-semibold text-white dark:text-zinc-100  hover:bg-transparent dark:hover:bg-transparent hover:opacity-80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-center justify-center"
        }
      >
        <ArrowUpIcon className="w-4 h-4 text-black dark:text-zinc-100" />
      </Button>
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
                    Promote member to admin
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      Are you sure you want to promote{" "}
                      {profile?.data.name || memberAddress} to admin?
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
                      onClick={promoteMember}
                      disabled={isPromoting}
                      className="text-zinc-100 text-base bg-brand-blue dark:text-zinc-100 dark:border-zinc-100 hover:bg-brand-blue/90 dark:hover:bg-brand-blue/90 dark:hover:text-white"
                    >
                      {isPromoting ? "Promoting..." : "Confirm"}
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
