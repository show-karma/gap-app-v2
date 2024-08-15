"use client";
/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useProjectStore } from "@/store";
import { shortAddress } from "@/utilities/shortAddress";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { Project, ProjectEndorsement } from "@show-karma/karma-gap-sdk";
import { useAccount, useSwitchChain } from "wagmi";
import { getGapClient, useGap } from "@/hooks";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useStepper } from "@/store/modals/txStepper";
import { Hex } from "viem";
import { config } from "@/utilities/wagmi/config";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

type EndorsementDialogProps = {};

export const EndorsementDialog: FC<EndorsementDialogProps> = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { isEndorsementOpen: isOpen, setIsEndorsementOpen: setIsOpen } =
    useEndorsementStore();
  const [comment, setComment] = useState<string>("");
  const project = useProjectStore((state) => state.project);
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { address } = useAccount();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();

  function closeModal() {
    setIsOpen(false);
  }

  const { changeStepperStep, setIsStepper } = useStepper();

  const handleFunction = async () => {
    let gapClient = gap;
    setIsLoading(true);
    try {
      if (!project) return;
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: project?.chainID,
      });
      if (!walletClient || !address || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const endorsement = new ProjectEndorsement({
        data: {
          comment,
        },
        schema: gapClient!.findSchema("ProjectEndorsement"),
        refUID: project?.uid,
        recipient: address,
      });
      await endorsement
        .attest(walletSigner, changeStepperStep)
        .then(async (res) => {
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, endorsement.chainID),
              "POST",
              {}
            );
          }
          let retries = 1000;
          refreshProject();
          let fetchedProject: Project | null = null;
          changeStepperStep("indexing");
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(project.uid as Hex)
              .catch(() => null);
            if (
              fetchedProject?.endorsements?.find(
                (end) => end.uid === endorsement.uid
              )
            ) {
              retries = 0;
              changeStepperStep("indexed");
              router.push(
                PAGES.PROJECT.OVERVIEW(
                  (project.details?.data?.slug || project?.uid) as string
                )
              );
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
      closeModal();
    } catch (error) {
      console.log(error);
      errorManager(
        `Error of user ${address} endorsing project ${project?.uid}`,
        error
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  return (
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
                  className="text-xl font-normal leading-6 text-gray-900 dark:text-zinc-100"
                >
                  You are endorsing{" "}
                  <b>
                    {project?.details?.data?.title ||
                      (project?.uid
                        ? shortAddress(project?.uid as string)
                        : "this project")}
                  </b>
                </Dialog.Title>
                <div className="mt-8 flex flex-col gap-2">
                  <p className="text-sm">{`Leave a comment of why you are endorsing this project (optional)`}</p>
                  <MarkdownEditor
                    placeholderText="I'm endorsing this project because..."
                    value={comment}
                    onChange={(newValue: string) => {
                      setComment(newValue || "");
                    }}
                  />
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
                    className="text-white text-lg bg-brand-blue border-brand-blue  hover:bg-brand-blue hover:text-white"
                    onClick={handleFunction}
                    disabled={isLoading}
                    isLoading={isLoading}
                  >
                    Endorse
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
