"use client"
import { Dialog, Transition } from "@headlessui/react"
import { XMarkIcon } from "@heroicons/react/24/solid"
import Image from "next/image"
import { type FC, Fragment } from "react"
/* eslint-disable @next/next/no-img-element */
import {
  BlogIcon,
  Discord2Icon,
  DiscussionIcon,
  OrganizationIcon,
  Telegram2Icon,
  Twitter2Icon,
} from "@/components/Icons"
import { Button } from "@/components/Utilities/Button"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import formatCurrency from "@/utilities/formatCurrency"
import { cn } from "@/utilities/tailwind"
import { registryHelper } from "./helper"
import type { GrantProgram } from "./ProgramList"

type ProgramDetailsDialogProps = {
  program: GrantProgram
  isOpen: boolean
  closeModal: () => void
}

const cardClassnames = {
  div: "flex flex-col gap-2 bg-[#F4F8FF] dark:bg-zinc-600 rounded-xl py-3 px-4",
  label: "text-base text-gray-900 font-body dark:text-zinc-100 font-semibold",
  list: "flex flex-row gap-2 flex-wrap",
  pill: "rounded-full font-body flex flex-row gap-2 bg-white px-2 py-1 text-sm text-[#155EEF] font-medium dark:bg-zinc-700 dark:text-zinc-100",
}

const statsClassnames = {
  div: "flex flex-row justify-between gap-2 items-center px-4 py-0.5",
  label: "text-base font-body font-normal text-gray-900 dark:text-zinc-100",
  pill: "text-base font-body text-zinc-600 font-semibold dark:text-zinc-300",
}

const iconsClassnames = {
  light: "text-black dark:text-white dark:hidden",
  dark: "text-black dark:text-white hidden dark:block",
  general: "w-6 h-6 text-black dark:text-white",
}

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
  ]

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

          <div className="fixed inset-0 overflow-y-auto" id="grant-program-details-modal">
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
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded dark:bg-zinc-800 bg-white text-left align-middle  transition-all">
                  <div className="px-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                    >
                      <div className="flex flex-row-reverse w-full pt-5 pb-5">
                        <button
                          type="button"
                          className=" hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                          onClick={closeModal}
                        >
                          <XMarkIcon className="w-6 h-6" />
                        </button>
                      </div>
                      <div className={"flex flex-row max-sm:flex-col gap-2 justify-between pb-3"}>
                        <div className="flex flex-1">
                          {program.metadata?.grantTypes?.length ? (
                            <div className={cardClassnames.list}>
                              {program.metadata?.grantTypes?.map((grantType) => (
                                <div
                                  key={grantType}
                                  className={cn(
                                    cardClassnames.pill,
                                    "bg-[#F2F4F7] py-1 px-3 rounded-full text-[#1D2939]"
                                  )}
                                >
                                  {grantType}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-row gap-1">
                          {program.metadata?.socialLinks?.grantsSite ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.grantsSite.includes("http")
                                  ? program.metadata?.socialLinks?.grantsSite
                                  : `https://${program.metadata?.socialLinks?.grantsSite}`
                              }
                              className="w-max"
                            >
                              <Image
                                className={cn(iconsClassnames.general, iconsClassnames.light)}
                                width={20}
                                height={20}
                                src="/icons/globe.svg"
                                alt={program.metadata?.socialLinks?.grantsSite}
                              />
                              <Image
                                width={20}
                                height={20}
                                className={cn(iconsClassnames.general, iconsClassnames.dark)}
                                src="/icons/globe-white.svg"
                                alt={program.metadata?.socialLinks?.grantsSite}
                              />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.twitter ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.twitter.includes("http")
                                  ? program.metadata?.socialLinks?.twitter
                                  : `https://${program.metadata?.socialLinks?.twitter}`
                              }
                              className="w-max"
                            >
                              <Twitter2Icon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.discord ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.discord.includes("http")
                                  ? program.metadata?.socialLinks?.discord
                                  : `https://${program.metadata?.socialLinks?.discord}`
                              }
                              className="w-max"
                            >
                              <Discord2Icon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.telegram ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.telegram.includes("http")
                                  ? program.metadata?.socialLinks?.telegram
                                  : `https://${program.metadata?.socialLinks?.telegram}`
                              }
                              className="w-max"
                            >
                              <Telegram2Icon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.forum ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.forum.includes("http")
                                  ? program.metadata?.socialLinks?.forum
                                  : `https://${program.metadata?.socialLinks?.forum}`
                              }
                              className="w-max"
                            >
                              <DiscussionIcon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.blog ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.blog.includes("http")
                                  ? program.metadata?.socialLinks?.blog
                                  : `https://${program.metadata?.socialLinks?.blog}`
                              }
                              className="w-max"
                            >
                              <BlogIcon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                          {program.metadata?.socialLinks?.orgWebsite ? (
                            <ExternalLink
                              href={
                                program.metadata?.socialLinks?.orgWebsite.includes("http")
                                  ? program.metadata?.socialLinks?.orgWebsite
                                  : `https://${program.metadata?.socialLinks?.orgWebsite}`
                              }
                              className="w-max"
                            >
                              <OrganizationIcon className={iconsClassnames.general} />
                            </ExternalLink>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 w-max max-w-full font-body mt-2">
                        <h2 className="text-xl  font-body font-bold leading-6 text-gray-900 dark:text-zinc-100">
                          {program.metadata?.title}
                        </h2>
                      </div>
                    </Dialog.Title>
                  </div>
                  <div className="flex flex-col gap-4 mb-6 px-6">
                    <div className="whitespace-nowrap pt-2 pb-4 text-sm text-black dark:text-zinc-400 ">
                      <p className="w-full max-w-full text-wrap font-body">
                        {program.metadata?.description!}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4 py-3">
                      {program.metadata?.categories?.length ? (
                        <div className={cardClassnames.div}>
                          <label className={cardClassnames.label}>Categories</label>
                          <div className={cardClassnames.list}>
                            {program.metadata?.categories?.map((category) => (
                              <div key={category} className={cardClassnames.pill}>
                                {category}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {program.metadata?.networks?.length ? (
                        <div className={cardClassnames.div}>
                          <label className={cardClassnames.label}>Networks</label>
                          <div className={cardClassnames.list}>
                            {program.metadata?.networks?.map((network) => (
                              <div key={network} className={cardClassnames.pill}>
                                <div className="w-5 h-5 rounded-full flex justify-center items-center">
                                  {registryHelper.networkImages[network.toLowerCase()] ? (
                                    <>
                                      <Image
                                        width={20}
                                        height={20}
                                        src={
                                          registryHelper.networkImages[network.toLowerCase()].light
                                        }
                                        alt={network}
                                        className="rounded-full w-5 h-5  dark:hidden"
                                      />
                                      <Image
                                        width={20}
                                        height={20}
                                        src={
                                          registryHelper.networkImages[network.toLowerCase()].dark
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
                        <div className={cardClassnames.div}>
                          <label className={cardClassnames.label}>Ecosystems</label>
                          <div className={cardClassnames.list}>
                            {program.metadata?.ecosystems?.map((ecosystem) => (
                              <div key={ecosystem} className={cardClassnames.pill}>
                                {ecosystem}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {program.metadata?.platformsUsed?.length ? (
                        <div className={cardClassnames.div}>
                          <label className={cardClassnames.label}>Platforms Used</label>
                          <div className={cardClassnames.list}>
                            {program.metadata?.platformsUsed?.map((platform) => (
                              <div key={platform} className={cardClassnames.pill}>
                                {platform}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {program.metadata?.organizations?.length ? (
                        <div className={cardClassnames.div}>
                          <label className={cardClassnames.label}>Organizations</label>
                          <div className={cardClassnames.list}>
                            {program.metadata?.organizations?.map((organization) => (
                              <div key={organization} className={cardClassnames.pill}>
                                {organization}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {program.metadata?.programBudget ||
                      program.metadata?.minGrantSize ||
                      program.metadata?.maxGrantSize ||
                      program.metadata?.amountDistributedToDate ||
                      program.metadata?.grantsToDate ? (
                        <div className="flex flex-col gap-1 divide-y divide-y-zinc-200  bg-[#F4F8FF] rounded-xl py-3">
                          {program?.metadata?.programBudget ? (
                            <div className={statsClassnames.div}>
                              <label className={statsClassnames.label}>Budget</label>
                              <p className={statsClassnames.pill}>
                                {program?.metadata?.programBudget
                                  ? formatCurrency(+program?.metadata?.programBudget) === "NaN"
                                    ? program?.metadata?.programBudget
                                    : `$${formatCurrency(+program?.metadata?.programBudget)}`
                                  : ""}
                              </p>
                            </div>
                          ) : null}
                          {program?.metadata?.minGrantSize && program?.metadata?.maxGrantSize ? (
                            <div className={statsClassnames.div}>
                              <label className={statsClassnames.label}>Grant Size</label>
                              <div className={statsClassnames.pill}>
                                {program?.metadata?.minGrantSize && program?.metadata?.maxGrantSize
                                  ? `$${formatCurrency(
                                      +program?.metadata?.minGrantSize
                                    )} - $${formatCurrency(+program?.metadata?.maxGrantSize)}`
                                  : ""}
                              </div>
                            </div>
                          ) : null}
                          {program?.metadata?.amountDistributedToDate ? (
                            <div className={statsClassnames.div}>
                              <label className={statsClassnames.label}>
                                Amount Distributed to Date
                              </label>
                              <p className={statsClassnames.pill}>
                                {program?.metadata?.amountDistributedToDate
                                  ? formatCurrency(+program?.metadata?.amountDistributedToDate) ===
                                    "NaN"
                                    ? program?.metadata?.amountDistributedToDate
                                    : `$${formatCurrency(
                                        +program?.metadata?.amountDistributedToDate
                                      )}`
                                  : ""}
                              </p>
                            </div>
                          ) : null}
                          {program?.metadata?.grantsToDate ? (
                            <div className={statsClassnames.div}>
                              <label className={statsClassnames.label}>Grants Issued to Date</label>
                              <p className={statsClassnames.pill}>
                                {program?.metadata?.amountDistributedToDate
                                  ? formatCurrency(+program.metadata.amountDistributedToDate)
                                  : null}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-row mt-2 gap-10 justify-end items-center border-none">
                      {program?.metadata?.bugBounty ? (
                        <div className="flex flex-col gap-1">
                          <ExternalLink
                            href={program?.metadata?.bugBounty}
                            className="text-base font-bold font-body text-[#155EEF] cursor-pointer"
                          >
                            Bug Bounty
                          </ExternalLink>
                        </div>
                      ) : null}
                      {program.metadata?.socialLinks?.grantsSite ? (
                        <ExternalLink
                          href={
                            program.metadata?.socialLinks?.grantsSite.includes("http")
                              ? program.metadata?.socialLinks?.grantsSite
                              : `https://${program.metadata?.socialLinks?.grantsSite}`
                          }
                        >
                          <Button className="text-base font-body px-6 py-3 bg-brand-blue hover:bg-brand-blue rounded">
                            Apply
                          </Button>
                        </ExternalLink>
                      ) : null}
                    </div>
                  </div>
                  {program.programId ? (
                    <div className="border-t border-t-zinc-200 dark:border-t-zinc-600 px-6 py-3">
                      <p className="text-black dark:text-white">
                        Are you the manager of this grant program?{" "}
                        <ExternalLink
                          className="text-blue-600 underline"
                          href={`https://tally.so/r/3qB1PY?program_id=${program.programId}&program_name=karma`}
                        >
                          Claim
                        </ExternalLink>{" "}
                        this program to update it.
                      </p>
                    </div>
                  ) : null}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
