/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { useAccount } from "wagmi";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { MESSAGES } from "@/utilities/messages";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useStepper } from "@/store/modals/txStepper";
import { useOwnerStore, useProjectStore } from "@/store";
import {
  IGrantUpdate,
  IGrantUpdateStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { sanitizeObject } from "@/utilities/sanitize";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { useWallet } from "@/hooks/useWallet";

type VerifyGrantUpdateDialogProps = {
  grantUpdate: IGrantUpdate;
  addVerifiedUpdate: (newVerified: IGrantUpdateStatus) => void;
};

const schema = z.object({
  comment: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const VerifyGrantUpdateDialog: FC<VerifyGrantUpdateDialogProps> = ({
  grantUpdate,
  addVerifiedUpdate,
}) => {
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }
  const { address, isConnected, chain } = useAccount();

  const hasVerifiedThis = grantUpdate?.verified?.find(
    (v) => v.attester?.toLowerCase() === address?.toLowerCase()
  );
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    let gapClient = gap;
    if (!gap) throw new Error("Please, connect a wallet");
    try {
      setIsLoading(true);
      if (
        !checkNetworkIsValid(chain?.id) ||
        chain?.id !== grantUpdate.chainID
      ) {
        await switchChainAsync?.({ chainId: grantUpdate.chainID });
        gapClient = getGapClient(grantUpdate.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        grantUpdate.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);

      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === grantUpdate.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const grantUpdateInstance = grantInstance.updates.find(
        (u) => u.uid.toLowerCase() === grantUpdate.uid.toLowerCase()
      );
      if (!grantUpdateInstance) return;
      await grantUpdateInstance
        .verify(
          walletSigner,
          sanitizeObject({
            reason: data.comment,
          }),
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grantUpdateInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const foundGrant = fetchedProject?.grants.find(
                  (g) => g.uid === grantUpdate.refUID
                );

                const fetchedGrantUpdate = foundGrant?.updates.find(
                  (u: any) => u.uid === grantUpdate.uid
                );

                const alreadyExists = fetchedGrantUpdate?.verified?.find(
                  (v: any) =>
                    v.attester?.toLowerCase() === address?.toLowerCase()
                );

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.GRANT.GRANT_UPDATE.VERIFY.SUCCESS);
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
      closeModal();
    } catch (error: any) {
      console.log(error);
      errorManager(
        MESSAGES.GRANT.GRANT_UPDATE.VERIFY.ERROR,
        error,
        {
          grantUpdateUID: grantUpdate.uid,
          grantUID: grantUpdate.refUID,
          address,
        },
        { error: MESSAGES.GRANT.GRANT_UPDATE.VERIFY.ERROR }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };
  const isAuthorized = useAuthStore((state) => state.isAuth);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const verifyPermission = () => {
    if (!isAuthorized || !isConnected) return false;
    return isContractOwner || !isProjectAdmin;
  };
  const ableToVerify = verifyPermission();
  if (hasVerifiedThis || !ableToVerify) return null;

  return (
    <>
      <Button
        onClick={openModal}
        className="flex flex-row gap-2 border border-brand-blue text-brand-blue  text-sm font-semibold bg-white hover:bg-white dark:bg-transparent dark:hover:bg-transparent p-3  rounded-md max-sm:px-2 max-sm:py-1"
      >
        Verify update
        <ArrowRightIcon className="w-4 h-4" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex w-full flex-col gap-4"
                  >
                    <div className="flex w-full flex-col">
                      <label htmlFor="comment" className={"text-sm font-bold"}>
                        Post a comment (optional)
                      </label>
                      <textarea
                        id="comment"
                        className={
                          "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        }
                        placeholder="I tested and can confirm it works as expected"
                        {...register("comment")}
                      />
                      <p className="text-base text-red-400">
                        {errors.comment?.message}
                      </p>
                    </div>
                    <div className="flex flex-row gap-4 justify-end">
                      <Button
                        className="text-zinc-900 hover:bg-transparent text-base bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:opacity-75 disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                        onClick={closeModal}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-white text-base bg-blue-600 border-black  hover:bg-blue-600 hover:text-white"
                        disabled={isLoading}
                        isLoading={isLoading}
                        type="submit"
                      >
                        Verify update
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
