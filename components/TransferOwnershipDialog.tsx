/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "./Utilities/Button";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { transferOwnership, useSigner } from "@/utilities";
import { useOwnerStore, useProjectStore } from "@/store";

type TransferOwnershipProps = {
  buttonElement?: {
    text: string;
    icon: ReactNode;
    styleClass: string;
  };
};

export const TransferOwnershipDialog: FC<TransferOwnershipProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
    text: "New Project",
    styleClass:
      "flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
  },
}) => {
  let [isOpen, setIsOpen] = useState(false);
  const [newOwner, setNewOwner] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [validAddress, setValidAddress] = useState(true);

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }
  const signer = useSigner();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const transfer = async () => {
    if (!project) return;
    if (!newOwner || !isAddress(newOwner)) {
      toast.error("Please enter a valid address");
      return;
    }
    try {
      setIsLoading(true);
      await transferOwnership(project, newOwner, signer).then(async () => {
        await refreshProject();
        toast.success("Ownership transferred successfully");
      });
    } catch (error) {
      toast.error("Something went wrong. Please try again later.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
    close();
  };

  useEffect(() => {
    if (newOwner?.length) setValidAddress(isAddress(newOwner));
  }, [newOwner]);

  return (
    <>
      <Button
        disabled={!isProjectOwner}
        onClick={openModal}
        className={buttonElement.styleClass}
      >
        {buttonElement.icon}
        {buttonElement.text}
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
                      disabled={isLoading || !newOwner}
                      isLoading={isLoading}
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
