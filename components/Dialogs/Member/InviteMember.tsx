"use client";
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Dialog, Transition } from "@headlessui/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { FC, Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { keccak256, toHex } from "viem";
import { useSignMessage } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import { queryClient } from "@/components/Utilities/WagmiProvider";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { envVars } from "@/utilities/enviromentVars";
import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

type InviteMemberDialogProps = {};

interface InviteCode {
  id: string;
  hash: string;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

const getCurrentCode = async (projectIdOrSlug: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.PROJECT.INVITATION.GET_LINKS(projectIdOrSlug)
    );
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0] as InviteCode;
  } catch (e) {
    errorManager("Failed to get current code", e);
    return null;
  }
};

export const InviteMemberDialog: FC<InviteMemberDialogProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const project = useProjectStore((state) => state.project);
  const { signMessageAsync } = useSignMessage();
  const [, copyToClipboard] = useCopyToClipboard();
  const { data, isSuccess } = useQuery<InviteCode | null>({
    queryKey: ["invite-code"],
    queryFn: () => getCurrentCode(project?.uid as string),
    enabled: !!project,
  });
  const code = data?.hash;
  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };
  const generateCode = async () => {
    setIsLoading(true);
    try {
      const messageToSign = new Date().getTime();
      const hexedMessage = keccak256(toHex(messageToSign));
      const [data, error] = await fetchData(
        INDEXER.PROJECT.INVITATION.NEW_CODE(project?.uid as string),
        "POST",
        {
          hash: hexedMessage,
        }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["invite-code"] });
    } catch (e) {
      errorManager("Failed to generate code to invite members", e);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeCode = async () => {
    try {
      const [response, error] = await fetchData(
        INDEXER.PROJECT.INVITATION.REVOKE_CODE(
          project?.uid as string,
          data?.id as string
        ),
        "PUT"
      );
      if (error) throw error;
      toast.success("Invite code revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["invite-code"] });
    } catch (e) {
      errorManager("Failed to revoke code", e);
    }
  };

  const urlToCode = `https://${
    envVars.isDev ? "gapstag.karmahq.app" : "gap.karmahq.xyz"
  }/project/${
    project?.details?.data.slug || project?.uid
  }/?invite-code=${code}`;

  useEffect(() => {
    if (isSuccess && !data && isOpen) {
      generateCode();
    }
  }, [isSuccess, data, isOpen]);

  return (
    <>
      <Button
        disabled={!isProjectOwner}
        onClick={openModal}
        className={
          "flex items-center gap-x-1 rounded-md bg-primary-500 dark:bg-primary-900/50 px-3 py-2 text-base font-semibold text-white dark:text-zinc-100  hover:bg-primary-600 dark:hover:bg-primary-900 text-center justify-center"
        }
      >
        Add Team Member
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
                    Invite team member to your project
                  </Dialog.Title>
                  <div className="flex flex-col gap-2 mt-8 h-full">
                    {code ? (
                      <div className="flex flex-col gap-2 h-full">
                        <p className="text-zinc-800 dark:text-zinc-100">
                          Share this invite link with your team member to join
                          your project.
                        </p>
                        <div className=" items-center flex flex-row gap-2 h-max max-h-40">
                          <Button
                            className="text-zinc-800 font-normal hover:opacity-75 dark:text-zinc-100 w-full h-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded-md text-wrap break-all text-left"
                            onClick={() => {
                              copyToClipboard(urlToCode);
                              setIsCopied(true);
                            }}
                          >
                            {urlToCode}
                          </Button>
                          <div className="flex flex-row gap-0 h-full">
                            <Tooltip.Provider>
                              <Tooltip.Root delayDuration={0}>
                                <Tooltip.Trigger asChild>
                                  <div className="flex w-max h-max">
                                    <Button
                                      className="text-zinc-600 p-2 hover:opacity-75 bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 h-full rounded-l-md rounded-r-none"
                                      onClick={() => {
                                        copyToClipboard(urlToCode);
                                        setIsCopied(true);
                                      }}
                                    >
                                      {isCopied ? (
                                        <CheckIcon className="w-6 h-6" />
                                      ) : (
                                        <ClipboardDocumentIcon className="w-6 h-6" />
                                      )}
                                    </Button>
                                  </div>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
                                    sideOffset={5}
                                    side="top"
                                  >
                                    <p>Copy to clipboard</p>
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                            <Tooltip.Provider>
                              <Tooltip.Root delayDuration={0}>
                                <Tooltip.Trigger asChild>
                                  <div className="flex w-max h-max">
                                    <Button
                                      className=" text-blue-900 bg-blue-200 dark:text-blue-200 dark:bg-blue-900 p-2 hover:opacity-75 hover:bg-blue-300 dark:hover:bg-blue-800 rounded-r-md rounded-l-none h-full"
                                      onClick={() => {
                                        setIsCopied(false);
                                        revokeCode();
                                      }}
                                    >
                                      <ArrowPathIcon className="w-6 h-6" />
                                    </Button>
                                  </div>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
                                    sideOffset={5}
                                    side="top"
                                  >
                                    <p>Generate a new code</p>
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </div>
                        </div>
                      </div>
                    ) : isLoading ? (
                      <p className="text-black dark:text-zinc-200 text-base">
                        Generating code...
                      </p>
                    ) : (
                      <Spinner />
                    )}
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