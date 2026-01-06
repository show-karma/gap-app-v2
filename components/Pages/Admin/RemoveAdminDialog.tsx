/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { GAP } from "@show-karma/karma-gap-sdk";
import { type FC, Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { useWallet } from "@/hooks/useWallet";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { Button } from "../../Utilities/Button";

const _inputStyle = "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  address: z
    .string()
    .min(3, { message: MESSAGES.COMMUNITY_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.COMMUNITY_FORM.TITLE.MAX }),
});

type SchemaType = z.infer<typeof schema>;
interface CommunityAdmin {
  id: string;
  admins: { user: { id: string } }[];
}

type RemoveAdminDialogProps = {
  UUID: `0x${string}`;
  chainid: number;
  Admin: `0x${string}`;
  fetchAdmins: () => void;
};

export const RemoveAdmin: FC<RemoveAdminDialogProps> = ({ UUID, chainid, Admin, fetchAdmins }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAccount();
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
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();

  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit = async () => {
    setIsLoading(true); // Set loading state to true
    const { success, chainId: actualChainId } = await ensureCorrectChain({
      targetChainId: chainid,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!success) {
      setIsLoading(false);
      return;
    }

    const { walletClient, error } = await safeGetWalletClient(actualChainId);

    if (error || !walletClient) {
      throw new Error("Failed to connect to wallet", { cause: error });
    }
    if (!walletClient) return;
    const walletSigner = await walletClientToSigner(walletClient);
    try {
      const communityResolver = (await GAP.getCommunityResolver(walletSigner)) as any;
      changeStepperStep("preparing");
      const communityResponse = await communityResolver.delist(UUID, Admin);

      changeStepperStep("pending");
      const { hash } = communityResponse;
      await communityResponse.wait().then(async () => {
        if (hash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(hash, chainid), "POST", {});
        }
        changeStepperStep("indexing");
        let retries = 5;
        let addressRemoved = false;
        while (retries > 0) {
          try {
            const [response, error] = await fetchData(
              INDEXER.COMMUNITY.ADMINS(UUID),
              "GET",
              {},
              {},
              {},
              false
            );
            if (!response || error) {
              throw new Error(`Error fetching admins for community ${UUID}`);
            }

            addressRemoved = !response.admins.some(
              (admin: any) => admin.user.id.toLowerCase() === Admin.toLowerCase()
            );

            if (addressRemoved) {
              await fetchAdmins();
              changeStepperStep("indexed");
              toast.success("Admin removed successfully!");
              closeModal(); // Close the dialog upon successful submission
              break;
            }
          } catch (_error: any) {}

          retries -= 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    } catch (error: any) {
      errorManager(`Error removing admin of ${UUID}`, error, {
        removingAdmin: Admin,
        community: UUID,
        address,
      });
    } finally {
      setIsStepper(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button className="bg-transparent" onClick={openModal}>
        <TrashIcon width={20} color="red" />
      </button>
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
                        Note : Removing an admin will remove their ability to manage the community.
                      </p>
                    </div>
                  }

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <div className={labelStyle}>Community UUID</div>
                        <div>{UUID}</div>
                      </div>
                    </div>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <div className={labelStyle}>Admin</div>
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
                        // type={"submit"}
                        className="flex flex-row gap-2 items-center justify-center rounded-md border border-transparent bg-red-500 px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        isLoading={isLoading}
                        onClick={onSubmit}
                      >
                        Remove Admin
                        <TrashIcon width={20} height={20} color="white" />
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
