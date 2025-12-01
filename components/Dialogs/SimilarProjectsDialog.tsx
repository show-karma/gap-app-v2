/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, Fragment } from "react";
import { useSimilarProjectsModalStore } from "@/store/modals/similarProjects";
import type { ProjectV2Response } from "@/types/project";
import { PAGES } from "@/utilities/pages";
import { Button } from "../Utilities/Button";
import { ExternalLink } from "../Utilities/ExternalLink";

type SimilarProjectsProps = {
  similarProjects: (ProjectV2Response | IProjectResponse)[];
  projectName: string;
};

export const SimilarProjectsDialog: FC<SimilarProjectsProps> = ({
  similarProjects,
  projectName,
}) => {
  const { isSimilarProjectsModalOpen: isOpen, closeSimilarProjectsModal: closeModal } =
    useSimilarProjectsModalStore();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={closeModal}>
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
              <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                >
                  Projects similar to {projectName}
                </Dialog.Title>
                <div className="flex flex-col gap-2 mt-8 overflow-x-auto ">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-zinc-700">
                        <th className="border border-gray-300 dark:border-zinc-600 px-4 py-2 text-left">
                          Project Name
                        </th>
                        <th className="border border-gray-300 dark:border-zinc-600 px-4 py-2 text-left">
                          Owner Address
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarProjects.map((project) => {
                        // Handle both V1 and V2 structures
                        const projectTitle =
                          (project as ProjectV2Response).details?.title ||
                          (project as IProjectResponse).details?.data?.title;
                        const projectSlug =
                          (project as ProjectV2Response).details?.slug ||
                          (project as IProjectResponse).details?.data?.slug;
                        const projectOwner =
                          (project as ProjectV2Response).owner ||
                          (project as IProjectResponse).recipient;

                        return (
                          <tr
                            key={project.uid}
                            className="hover:bg-gray-200 dark:hover:bg-zinc-900"
                          >
                            <td className="border border-gray-300 dark:border-zinc-600 px-4 py-2">
                              <ExternalLink
                                href={PAGES.PROJECT.OVERVIEW(projectSlug || project.uid)}
                                className="text-blue-500 underline"
                              >
                                {projectTitle || "Untitled Project"}
                              </ExternalLink>
                            </td>
                            <td className="border border-gray-300 dark:border-zinc-600 px-4 py-2">
                              {projectOwner}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-row gap-4 mt-10 justify-end">
                  <Button
                    className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                    onClick={closeModal}
                  >
                    Close
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
