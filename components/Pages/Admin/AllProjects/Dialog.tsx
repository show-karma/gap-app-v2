/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react"
import { type FC, Fragment, useState } from "react"
import { Button } from "@/components/Utilities/Button"
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview"
import { ReadMore } from "@/utilities/ReadMore"

type ProjectDescriptionDialogProps = {
  projectName: string
  description: string
  mission?: string
  problem?: string
  solution?: string
  missionSummary?: string
  locationOfImpact?: string
  businessModel?: string
  stageIn?: string
  raisedMoney?: string
  fundingPath?: string
}

const labelClass = "text-lg font-bold leading-6 text-gray-900 dark:text-zinc-100"
const valueClass = "text-sm text-gray-600 dark:text-zinc-300"

export const ProjectDescriptionDialog: FC<ProjectDescriptionDialogProps> = ({
  projectName,
  description,
  mission,
  problem,
  solution,
  missionSummary,
  locationOfImpact,
  businessModel,
  stageIn,
  raisedMoney,
  fundingPath,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    setIsOpen(true)
  }

  const stats = [
    {
      label: "Description",
      value: description,
    },
    {
      label: "Mission",
      value: mission,
    },
    {
      label: "Problem",
      value: problem,
    },
    {
      label: "Solution",
      value: solution,
    },
    {
      label: "Mission Summary",
      value: missionSummary,
    },
    {
      label: "Location of Impact",
      value: locationOfImpact,
    },
    {
      label: "Business Model",
      value: businessModel,
    },
    {
      label: "Stage",
      value: stageIn,
    },
    {
      label: "Money Raised",
      value: raisedMoney,
    },
    {
      label: "Funding Path",
      value: fundingPath,
    },
  ]

  return (
    <>
      <MarkdownPreview className="line-clamp-2" source={description} />
      <Button
        onClick={openModal}
        className="px-0 py-0 bg-transparent text-blue-500 underline hover:bg-transparent dark:hover:bg-transparent"
      >
        See more
      </Button>
      {isOpen ? (
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
                      {projectName}
                    </Dialog.Title>
                    <div className="flex flex-col gap-y-2 mt-8">
                      {stats.map((stat) =>
                        stat.value ? (
                          <div className="flex flex-col gap-y-2" key={stat.label}>
                            <div className={labelClass}>{stat.label}</div>
                            <ReadMore markdownClass={valueClass}>{stat.value}</ReadMore>
                          </div>
                        ) : null
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      ) : null}
    </>
  )
}
