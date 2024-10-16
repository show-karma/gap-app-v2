"use client";
/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import { Button } from "@/components/Utilities/Button";
import toast from "react-hot-toast";
import { keccak256, toHex } from "viem";
import { useProjectStore } from "@/store";
import { useSignMessage } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { queryClient } from "@/components/Utilities/WagmiProvider";

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
  const [isOpen, setIsOpen] = useState(true);
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
      toast.success("Invite code generated successfully");
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

  const urlToCode = `https://gap-app-v2-git-feat-team-member-karma-devs.vercel.app
/project/${project?.details?.data.slug || project?.uid}/?invite-code=${code}`;

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
        Add new member
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
                  <div className="flex flex-col gap-2 mt-8">
                    {code ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-zinc-800 dark:text-zinc-100">
                          Please share your invite link with a team member.
                        </p>
                        <div className=" items-center flex flex-row gap-0 h-16">
                          <button
                            className="text-zinc-800 dark:text-zinc-100 w-full h-max bg-zinc-100 dark:bg-zinc-900 p-2 rounded-l-md text-wrap break-all text-left"
                            onClick={() => {
                              copyToClipboard(urlToCode);
                              setIsCopied(true);
                            }}
                          >
                            {code}
                          </button>

                          <button
                            className="text-zinc-600 p-2 hover:opacity-75 bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-100 h-full"
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
                          </button>
                          <button
                            className=" text-red-900 bg-red-200 dark:text-red-200 dark:bg-red-900 p-2 hover:opacity-75 rounded-r-md h-full"
                            onClick={() => {
                              setIsCopied(false);
                              revokeCode();
                            }}
                          >
                            <TrashIcon className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    ) : isLoading ? (
                      <p className="text-black dark:text-zinc-200 text-base">
                        To generate the code, please sign the message.
                      </p>
                    ) : (
                      <p className="text-black dark:text-zinc-200 text-base">
                        Seems like you don&apos;t have a code yet.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-base bg-transparent border-black border dark:text-zinc-100  dark:border-zinc-100 hover:bg-white hover:text-black disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="justify-center items-center flex text-center text-base"
                      onClick={generateCode}
                      disabled={isLoading}
                      isLoading={isLoading}
                    >
                      {code ? "Generate new code" : "Generate code"}
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
