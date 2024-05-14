/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MarkdownEditor } from "./Utilities/MarkdownEditor";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Community, GAP, nullRef } from "@show-karma/karma-gap-sdk";
import { Button } from "./Utilities/Button";
import { useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { appNetwork, getChainIdByName } from "@/utilities/network";
import { cn } from "@/utilities/tailwind";
import { useAuthStore } from "@/store/auth";
import { getGapClient, useGap } from "@/hooks";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getWalletClient } from "@wagmi/core";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  address: z.string().min(3, { message: MESSAGES.COMMUNITY_FORM.TITLE }),
});

type SchemaType = z.infer<typeof schema>;

type AddAdminDialogProps = {
  UUID: `0x${string}`;
  chainid: number;
  Admin: `0x${string}`;
};

export const RemoveAdmin: FC<AddAdminDialogProps> = ({
  UUID,
  chainid,
  Admin,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const {
    handleSubmit,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork({
    chainId: appNetwork[0].id,
  });

  const removeAdmin = async (data: SchemaType) => {
    if (chain?.id != chainid) {
      await switchNetworkAsync?.(chainid);
    }
    const walletClient = await getWalletClient({
      chainId: chainid,
    });
    if (!walletClient) return;
    const walletSigner = await walletClientToSigner(walletClient);
    try {
      const communityResolver = (await GAP.getCommunityResolver(
        walletSigner
      )) as any;
      const communityResponse = await communityResolver.delist(UUID, Admin);
      console.log(communityResponse);
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    try {
      setIsLoading(true); // Set loading state to true
      await removeAdmin(data); // Call the addAdmin function
      setIsLoading(false); // Reset loading state
      closeModal(); // Close the dialog upon successful submission
    } catch (error) {
      console.error("Error removing Community Admin:", error);
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <>
      <TrashIcon onClick={openModal} width={20} />
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Removing Community admin
                  </Dialog.Title>
                  <button
                    type="button"
                    className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  {
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-zinc-300">
                        Note : Removing an admin will remove their ability to
                        manage the community.
                      </p>
                    </div>
                  }

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <label className={labelStyle}>Community UUID</label>
                        <div>{UUID}</div>
                      </div>
                    </div>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <label className={labelStyle}>Admin</label>
                        <div>{Admin}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-row justify-end gap-4">
                      <button
                        type="button"
                        className="flex items-center flex-row gap-2 dark:border-white dark:text-zinc-100 justify-center rounded-md border bg-transparent border-gray-200 px-4 py-2 text-md font-medium text-black hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={closeModal}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>

                      <Button
                        type={"submit"}
                        className="flex flex-row gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        isLoading={isLoading}
                      >
                        Remove Admin
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
