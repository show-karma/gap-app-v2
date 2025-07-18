/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "wagmi";
import { GAP } from "@show-karma/karma-gap-sdk";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/utilities/messages";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { cn } from "@/utilities/tailwind";

import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { config } from "@/utilities/wagmi/config";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { sanitizeInput } from "@/utilities/sanitize";
import { isAddress } from "viem";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useWallet } from "@/hooks/useWallet";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  address: z
    .string()
    .min(3, { message: "Address too short" })
    .refine((data) => isAddress(data.toLowerCase()), {
      message: "Invalid address",
    }),
});

type SchemaType = z.infer<typeof schema>;

interface CommunityAdmin {
  id: string;
  admins: { user: { id: string } }[];
}

type AddAdminDialogProps = {
  buttonElement?: {
    text?: string;
    icon?: ReactNode;
    iconSide?: "left" | "right";
    styleClass: string;
  };
  UUID: `0x${string}`;
  chainid: number;
  fetchAdmins: () => Promise<any[] | undefined>;
};

export const AddAdmin: FC<AddAdminDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-brand-blue" />,
    iconSide: "left",
    text: "Add Admin",
    styleClass: "",
  },
  UUID,
  chainid,
  fetchAdmins,
}) => {
  const dataToUpdate = {
    address: "",
  };

  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  const [isLoading, setIsLoading] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();

  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit = async (data: SchemaType) => {
    if (chain?.id != chainid) {
      await switchChainAsync?.({ chainId: chainid });
    }

    const { walletClient, error } = await safeGetWalletClient(chainid);

    if (error || !walletClient) {
      throw new Error("Failed to connect to wallet", { cause: error });
    }
    const walletSigner = await walletClientToSigner(walletClient);
    try {
      const communityResolver = await GAP.getCommunityResolver(walletSigner);
      changeStepperStep("preparing");
      const address = sanitizeInput(data.address.toLowerCase());
      const communityResponse = await communityResolver.enlist(UUID, address);
      changeStepperStep("pending");
      const { hash } = communityResponse;
      await communityResponse.wait().then(async () => {
        if (hash) {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(hash, chainid),
            "POST",
            {}
          );
        }
        changeStepperStep("indexing");
        let retries = 1000;
        let addressAdded = false;
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

            addressAdded = response.admins.some(
              (admin: any) =>
                admin.user.id.toLowerCase() === data.address.toLowerCase()
            );

            if (addressAdded) {
              await fetchAdmins();
              changeStepperStep("indexed");
              toast.success("Admin added successfully!");
              closeModal(); // Close the dialog upon successful submission
              break;
            }
          } catch (error: any) {
            console.log("Retrying...");
          }

          retries -= 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    } catch (error: any) {
      errorManager(
        `Error adding admin ${data.address} to community ${UUID}`,
        error,
        {
          community: UUID,
          address: data.address,
        }
      );
      console.log(error);
    } finally {
      setIsStepper(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "flex justify-center min-w-max items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold text-brand-blue dark:text-zinc-100 hover:opacity-75 dark:hover:bg-primary-900",
          buttonElement.styleClass
        )}
      >
        {buttonElement.iconSide === "left" && buttonElement.icon}
        {buttonElement.text}
        {buttonElement.iconSide === "right" && buttonElement.icon}
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
                    Add a new Community Admin
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
                        Fill out these details to add a new Community Admin
                      </p>
                    </div>
                  }

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Address *
                        </label>
                        <input
                          id="address-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "0x5cd3g343..."'
                          {...register("address")}
                        />
                        <p className="text-red-500 text-sm">
                          {errors.address?.message}
                        </p>
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
                        Add Admin
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
