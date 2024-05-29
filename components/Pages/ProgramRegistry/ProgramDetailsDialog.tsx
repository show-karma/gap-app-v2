/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { isAddress } from "viem";
import { useProjectStore } from "@/store";

import { GrantProgram } from "./ProgramList";
import formatCurrency from "@/utilities/formatCurrency";
import Image from "next/image";
import { registryHelper } from "./helper";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

type ProgramDetailsDialogProps = {
  program: GrantProgram;
  isOpen: boolean;
  closeModal: () => void;
};

export const ProgramDetailsDialog: FC<ProgramDetailsDialogProps> = ({
  program,
  isOpen,
  closeModal,
}) => {
  return (
    <>
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
                    {program.metadata?.title || program.name}
                  </Dialog.Title>
                  <div className="flex flex-col gap-8 mt-8">
                    {program.metadata?.ecosystems?.length ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-base text-gray-900 dark:text-zinc-100">
                          Ecosystems
                        </label>
                        <div className="flex flex-row gap-2 flex-wrap">
                          {program.metadata?.ecosystems?.map((ecosystem) => (
                            <div
                              key={ecosystem}
                              className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800"
                            >
                              {ecosystem}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {program.metadata?.networks?.length ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-base text-gray-900 dark:text-zinc-100">
                          Networks
                        </label>
                        <div className="flex flex-row gap-2 flex-wrap">
                          {program.metadata?.networks?.map((network) => (
                            <div
                              key={network}
                              className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 flex flex-row gap-1 items-center"
                            >
                              {registryHelper.networkImages[
                                network.toLowerCase()
                              ] ? (
                                <div className="min-w-4 min-h-4 w-4 h-4 m-0">
                                  <Image
                                    width={16}
                                    height={16}
                                    src={
                                      registryHelper.networkImages[
                                        network.toLowerCase()
                                      ].light
                                    }
                                    alt={""}
                                    className="min-w-4 min-h-4 w-4 h-4 m-0 rounded-full block dark:hidden"
                                  />
                                  <Image
                                    width={16}
                                    height={16}
                                    src={
                                      registryHelper.networkImages[
                                        network.toLowerCase()
                                      ].dark
                                    }
                                    alt={""}
                                    className="min-w-4 min-h-4 w-4 h-4 m-0 rounded-full hidden dark:block"
                                  />
                                </div>
                              ) : null}
                              {network}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {program?.metadata?.programBudget ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-base text-gray-900 dark:text-zinc-100">
                          Budget
                        </label>
                        <p className="text-base text-zinc-600 dark:text-zinc-300">
                          {program?.metadata?.programBudget
                            ? formatCurrency(
                                +program?.metadata?.programBudget
                              ) === "NaN"
                              ? program?.metadata?.programBudget
                              : `$${formatCurrency(
                                  +program?.metadata?.programBudget
                                )}`
                            : ""}
                        </p>
                      </div>
                    ) : null}
                    {program?.metadata?.minGrantSize &&
                    program?.metadata?.maxGrantSize ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-base text-gray-900 dark:text-zinc-100">
                          Grant Size
                        </label>
                        <div className="text-base text-zinc-600 dark:text-zinc-300">
                          {program?.metadata?.minGrantSize &&
                          program?.metadata?.maxGrantSize
                            ? `$${formatCurrency(
                                +program?.metadata?.minGrantSize
                              )} - $${formatCurrency(
                                +program?.metadata?.maxGrantSize
                              )}`
                            : ""}
                        </div>
                      </div>
                    ) : null}
                    {program?.metadata?.bugBounty ? (
                      <div className="flex flex-col gap-1">
                        <ExternalLink
                          href={program?.metadata?.bugBounty}
                          className="text-base text-blue-400 underline cursor-pointer"
                        >
                          Bug bounty
                        </ExternalLink>
                      </div>
                    ) : null}
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
