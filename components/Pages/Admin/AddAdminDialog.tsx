/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { ChevronRightIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { GAP } from "@show-karma/karma-gap-sdk";
import { type FC, Fragment, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { cn } from "@/utilities/tailwind";
import { Button } from "../../ui/button";

const inputStyle = "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  email: z.string().email({ message: "Please provide a valid email address" }),
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
  fetchAdmins: () => void;
};

export const AddAdmin: FC<AddAdminDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4" />,
    iconSide: "left",
    text: "Add Admin",
    styleClass: "",
  },
  UUID,
  chainid,
  fetchAdmins,
}) => {
  const dataToUpdate = {
    email: "",
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
  const { setupChainAndWallet } = useSetupChainAndWallet();

  const { changeStepperStep, setIsStepper, startAttestation, showSuccess } = useAttestationToast();

  const onSubmit = async (data: SchemaType) => {
    setIsLoading(true);

    let resolvedWallet: string;
    try {
      const [resolveResult, resolveError] = await fetchData(
        INDEXER.V2.USERS.RESOLVE_WALLET,
        "POST",
        { email: data.email }
      );
      if (resolveError || !resolveResult?.walletAddress) {
        const errorMsg = resolveError?.includes("IDENTITY_SERVICE_UNAVAILABLE")
          ? "Unable to resolve email at this time. Please try again later."
          : "Failed to resolve wallet for this email.";
        errorManager(errorMsg, resolveError);
        setIsLoading(false);
        return;
      }
      resolvedWallet = resolveResult.walletAddress;
    } catch (error: any) {
      errorManager("Failed to resolve email to wallet address.", error);
      setIsLoading(false);
      return;
    }

    const setup = await setupChainAndWallet({
      targetChainId: chainid,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!setup) {
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const { walletSigner } = setup;
    try {
      startAttestation("Adding admin...");
      const communityResolver = await GAP.getCommunityResolver(walletSigner);
      const communityResponse = await communityResolver.enlist(UUID, resolvedWallet);
      changeStepperStep("pending");
      const { hash } = communityResponse;
      await communityResponse.wait().then(async () => {
        if (hash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(hash, chainid), "POST", {});
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
              (admin: any) => admin.user.id.toLowerCase() === resolvedWallet.toLowerCase()
            );

            if (addressAdded) {
              await fetchAdmins();
              changeStepperStep("indexed");
              showSuccess("Admin added successfully!");
              closeModal();
              break;
            }
          } catch (_error: any) {}

          retries -= 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    } catch (error: any) {
      errorManager(`Error adding admin ${data.email} to community ${UUID}`, error, {
        community: UUID,
        email: data.email,
      });
    } finally {
      setIsStepper(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={openModal}
        className={cn(
          "flex justify-center min-w-max items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold hover:opacity-75",
          buttonElement.styleClass
        )}
      >
        {buttonElement.iconSide === "left" && buttonElement.icon}
        {buttonElement.text}
        {buttonElement.iconSide === "right" && buttonElement.icon}
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
                        <label htmlFor="email-input" className={labelStyle}>
                          Email *
                        </label>
                        <input
                          id="email-input"
                          type="email"
                          className={inputStyle}
                          placeholder='e.g. "admin@example.com"'
                          {...register("email")}
                        />
                        <p className="text-red-500 text-sm">{errors.email?.message}</p>
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

                      <Button type={"submit"} isLoading={isLoading}>
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
