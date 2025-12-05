/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, Fragment, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import type { GrantMilestone } from "@/types/v2/grant";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

type VerifyMilestoneUpdateDialogProps = {
  milestone: GrantMilestone;
  onVerified: () => void;
  isVerified: boolean;
};

const schema = z.object({
  comment: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const VerifyMilestoneUpdateDialog: FC<VerifyMilestoneUpdateDialogProps> = ({
  milestone,
  onVerified,
  isVerified,
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  // V2: verified is now a boolean
  const hasVerifiedThis = isVerified;
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { changeStepperStep, setIsStepper } = useStepper();
  const project = useProjectStore((state) => state.project);

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    let gapClient = gap;
    if (!gap) throw new Error("Please, connect a wallet");
    try {
      setIsLoading(true);
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: milestone.chainID || 0,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === milestone.refUID?.toLowerCase() || ""
      );
      if (!grantInstance) return;
      const milestoneInstance = grantInstance.milestones?.find(
        (u) => u.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!milestoneInstance) return;
      await milestoneInstance
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
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const foundGrant = fetchedProject?.grants?.find((g) => g.uid === milestone.refUID);

                const fetchedMilestone = foundGrant?.milestones.find(
                  (u: any) => u.uid === milestone.uid
                );

                // V2: verified is now a boolean, not an array
                const alreadyExists = fetchedMilestone?.verified === true;

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.VERIFY.SUCCESS);
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
      errorManager(
        MESSAGES.MILESTONES.VERIFY.ERROR,
        error,
        {
          milestoneUID: milestone.uid,
          grantUID: milestone.refUID,
          address,
        },
        { error: MESSAGES.MILESTONES.VERIFY.ERROR }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };
  const { authenticated: isAuth } = useAuth();
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const verifyPermission = () => {
    if (!isAuth) return false;
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
                  <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
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
                      <p className="text-base text-red-400">{errors.comment?.message}</p>
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
