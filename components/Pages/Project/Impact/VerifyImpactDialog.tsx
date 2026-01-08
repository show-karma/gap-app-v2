/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  IProjectImpact,
  IProjectImpactStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, Fragment, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import type { Hex } from "viem";

import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useAuth } from "@/hooks/useAuth";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { useOwnerStore, useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";

type VerifyImpactDialogProps = {
  impact: IProjectImpact;
  addVerification: (newVerified: IProjectImpactStatus) => void;
};

const schema = z.object({
  comment: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const VerifyImpactDialog: FC<VerifyImpactDialogProps> = ({ impact, addVerification }) => {
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
  const { address, isConnected } = useAccount();

  const hasVerifiedThis = address
    ? impact?.verified?.find((v) => v.attester?.toLowerCase() === address?.toLowerCase())
    : null;
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const project = useProjectStore((state) => state.project);
  const projectIdOrSlug = project?.details?.slug || project?.uid || "";
  const { refetch: refetchImpacts } = useProjectImpacts(projectIdOrSlug);

  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    if (!address || !project) return;
    try {
      setIsLoading(true);
      startAttestation("Verifying impact...");
      const fetchedProject = await getProjectById(project.uid);
      const findImpact = fetchedProject?.impacts?.find((imp) => imp.uid === (impact.uid as string));
      if (!findImpact) return;

      const setup = await setupChainAndWallet({
        targetChainId: findImpact.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsLoading(false);
        return;
      }

      const { walletSigner } = setup;
      await findImpact
        .verify(
          walletSigner,
          sanitizeObject({
            reason: data.comment,
          }),
          changeStepperStep
        )
        .then(async (res) => {
          if (!project) return;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, findImpact.chainID), "POST", {});
          }
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            try {
              const polledImpacts = await getProjectImpacts(projectIdOrSlug);
              if (
                polledImpacts.find((polledImpact) =>
                  polledImpact.verified?.find(
                    (v: any) => v.attester?.toLowerCase() === address?.toLowerCase()
                  )
                )
              ) {
                retries = 0;
                await refetchImpacts();
                changeStepperStep("indexed");
                showSuccess("Impact verified successfully");
              }
            } catch {
              // Ignore polling errors, continue retrying
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
      closeModal();
    } catch (error: any) {
      showError(MESSAGES.PROJECT.IMPACT.VERIFY.ERROR);
      errorManager(
        MESSAGES.PROJECT.IMPACT.VERIFY.ERROR,
        error,
        {
          address,
          projectUID: project?.uid,
        },
        { error: MESSAGES.PROJECT.IMPACT.VERIFY.ERROR }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };
  const { authenticated: isAuth, login } = useAuth();
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
        onClick={() => {
          if (!isAuth) {
            login?.();
          } else {
            openModal();
          }
        }}
        className={
          "flex justify-center items-center gap-x-2 rounded-md bg-transparent dark:bg-transparent px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-300  hover:opacity-75 dark:hover:opacity-75 border border-red-200 dark:border-red-900 hover:bg-transparent"
        }
      >
        Verify impact
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
                        Verify impact
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
