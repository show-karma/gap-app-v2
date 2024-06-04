/* eslint-disable @next/next/no-img-element */
import { FC, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { GrantProgram } from "./ProgramList";
import formatCurrency from "@/utilities/formatCurrency";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import {
  BlogIcon,
  Discord2Icon,
  DiscussionIcon,
  OrganizationIcon,
  Twitter2Icon,
} from "@/components/Icons";
import Image from "next/image";
import { ReadMore } from "@/utilities/ReadMore";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { registryHelper } from "./helper";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

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
  const data = [
    {
      label: "Budget",
      component: <p>{program?.metadata?.programBudget}</p>,
    },
  ];

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
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    <div className="flex flex-col gap-2 w-max max-w-full">
                      <h2 className="text-2xl font-medium leading-6 text-gray-900 dark:text-zinc-100">
                        {program.metadata?.title || program.name}
                      </h2>

                      <div className="flex flex-row gap-1 w-full">
                        {program.metadata?.socialLinks?.website ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.website}
                            className="w-max"
                          >
                            <Image
                              className="w-5 h-5 text-black dark:text-white dark:hidden"
                              width={20}
                              height={20}
                              src="/icons/globe.svg"
                              alt={program.metadata?.socialLinks?.website}
                            />
                            <Image
                              width={20}
                              height={20}
                              className="w-5 h-5 text-black dark:text-white hidden dark:block"
                              src="/icons/globe-white.svg"
                              alt={program.metadata?.socialLinks?.website}
                            />
                          </ExternalLink>
                        ) : null}
                        {program.metadata?.socialLinks?.twitter ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.twitter}
                            className="w-max"
                          >
                            <Twitter2Icon className="w-5 h-5 text-black dark:text-white" />
                          </ExternalLink>
                        ) : null}
                        {program.metadata?.socialLinks?.discord ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.discord}
                            className="w-max"
                          >
                            <Discord2Icon className="w-5 h-5 text-black dark:text-white" />
                          </ExternalLink>
                        ) : null}
                        {program.metadata?.socialLinks?.forum ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.forum}
                            className="w-max"
                          >
                            <DiscussionIcon className="w-5 h-5 text-black dark:text-white" />
                          </ExternalLink>
                        ) : null}
                        {program.metadata?.socialLinks?.blog ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.blog}
                            className="w-max"
                          >
                            <BlogIcon className="w-5 h-5 text-black dark:text-white" />
                          </ExternalLink>
                        ) : null}
                        {program.metadata?.socialLinks?.orgWebsite ? (
                          <ExternalLink
                            href={program.metadata?.socialLinks?.orgWebsite}
                            className="w-max"
                          >
                            <OrganizationIcon className="w-5 h-5 text-black dark:text-white" />
                          </ExternalLink>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                      onClick={closeModal}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </Dialog.Title>
                  <div className="flex flex-col gap-4 mt-2  divide-y divide-zinc-200">
                    <div className="whitespace-nowrap py-4 text-sm text-black dark:text-zinc-400 ">
                      <div
                        className="w-full max-w-full text-wrap"
                        data-color-mode="light"
                      >
                        <MarkdownPreview
                          source={program.metadata?.description!}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 py-3">
                      {program.metadata?.categories?.length ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Categories
                          </label>
                          <div className="flex flex-row gap-2 flex-wrap">
                            {program.metadata?.categories?.map((category) => (
                              <div
                                key={category}
                                className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                              >
                                {category}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {program.metadata?.grantTypes?.length ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Types
                          </label>
                          <div className="flex flex-row gap-2 flex-wrap">
                            {program.metadata?.grantTypes?.map((grantType) => (
                              <div
                                key={grantType}
                                className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                              >
                                {grantType}
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
                                className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 flex flex-row gap-2 items-center dark:bg-zinc-700 dark:text-zinc-100"
                              >
                                <div className="w-5 h-5 rounded-full flex justify-center items-center">
                                  {registryHelper.networkImages[
                                    network.toLowerCase()
                                  ] ? (
                                    <>
                                      <Image
                                        width={20}
                                        height={20}
                                        src={
                                          registryHelper.networkImages[
                                            network.toLowerCase()
                                          ].light
                                        }
                                        alt={network}
                                        className="rounded-full w-5 h-5  dark:hidden"
                                      />
                                      <Image
                                        width={20}
                                        height={20}
                                        src={
                                          registryHelper.networkImages[
                                            network.toLowerCase()
                                          ].dark
                                        }
                                        alt={network}
                                        className="rounded-full w-5 h-5  hidden dark:block"
                                      />
                                    </>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full flex justify-center items-center bg-gray-500" />
                                  )}
                                </div>
                                {network}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {program.metadata?.ecosystems?.length ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Ecosystems
                          </label>
                          <div className="flex flex-row gap-2 flex-wrap">
                            {program.metadata?.ecosystems?.map((ecosystem) => (
                              <div
                                key={ecosystem}
                                className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                              >
                                {ecosystem}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {program.metadata?.organizations?.length ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Organizations
                          </label>
                          <div className="flex flex-row gap-2 flex-wrap">
                            {program.metadata?.organizations?.map(
                              (organization) => (
                                <div
                                  key={organization}
                                  className="rounded-full bg-zinc-100 px-2 py-1 text-sm text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                                >
                                  {organization}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-2 py-6 my-6">
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
                      {program?.metadata?.amountDistributedToDate ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Amount distributed to date
                          </label>
                          <p className="text-base text-zinc-600 dark:text-zinc-300">
                            {program?.metadata?.amountDistributedToDate
                              ? formatCurrency(
                                  +program?.metadata?.amountDistributedToDate
                                ) === "NaN"
                                ? program?.metadata?.amountDistributedToDate
                                : `$${formatCurrency(
                                    +program?.metadata?.amountDistributedToDate
                                  )}`
                              : ""}
                          </p>
                        </div>
                      ) : null}
                      {program?.metadata?.grantsToDate ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-base text-gray-900 dark:text-zinc-100">
                            Grants issued to date
                          </label>
                          <p className="text-base text-zinc-600 dark:text-zinc-300">
                            {program?.metadata?.amountDistributedToDate}
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
                    </div>

                    <div className="flex flex-row gap-10 justify-end items-center border-none">
                      {program?.metadata?.bugBounty ? (
                        <div className="flex flex-col gap-1">
                          <ExternalLink
                            href={program?.metadata?.bugBounty}
                            className="text-base text-blue-500 underline cursor-pointer"
                          >
                            Bug bounty
                          </ExternalLink>
                        </div>
                      ) : null}
                      {program.metadata?.socialLinks?.grantsSite ? (
                        <ExternalLink
                          href={program.metadata?.socialLinks?.grantsSite}
                        >
                          <Button className="text-base px-6">Apply</Button>
                        </ExternalLink>
                      ) : null}
                    </div>
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
