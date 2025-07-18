"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/lib/utils/error-manager";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { useOwnerStore } from "@/store/owner";
import { useCommunityAdminStore } from "@/src/features/communities/lib/community-admin-store";
import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/config/messages";
import { Dialog, Transition } from "@headlessui/react";
import {
  LinkIcon,
  FingerPrintIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

interface LinkOSOProfileButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
  "data-link-oso-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

export const LinkOSOProfileButton: FC<LinkOSOProfileButtonProps> = ({
  project,
  buttonClassName,
  "data-link-oso-button": dataAttr,
  buttonElement,
  onClose,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { address } = useAccount();
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const { refreshProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.external?.oso?.length) {
      setIds(project.external.oso);
    } else {
      setIds([""]); // Start with one empty input
    }
  }, [project?.external?.oso]);

  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  const handleAddId = () => {
    setIds([...ids, ""]);
  };

  const handleRemoveId = (index: number) => {
    const newIds = ids.filter((_, i) => i !== index);
    if (newIds.length === 0) {
      setIds([""]); // Always keep at least one input
    } else {
      setIds(newIds);
    }
  };

  const handleIdChange = (index: number, value: string) => {
    const newIds = [...ids];
    newIds[index] = value;
    setIds(newIds);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    const validIds = ids.filter((id) => id.trim() !== "");
    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "oso",
          ids: validIds,
        }
      );

      if (data) {
        setIds(validIds);
        toast.success(MESSAGES.PROJECT.LINK_OSO_PROFILE.SUCCESS);
        if (buttonElement === null && onClose) {
          setIsOpen(false);
          onClose();
        }
        refreshProject();
      }

      if (error) {
        setError(MESSAGES.PROJECT.LINK_OSO_PROFILE.ERROR);
        throw new Error(MESSAGES.PROJECT.LINK_OSO_PROFILE.ERROR);
      }
    } catch (err) {
      setError(MESSAGES.PROJECT.LINK_OSO_PROFILE.ERROR);
      errorManager(
        MESSAGES.PROJECT.LINK_OSO_PROFILE.ERROR,
        err,
        { projectUID: project.uid, target: "oso", ids: validIds, address },
        { error: MESSAGES.PROJECT.LINK_OSO_PROFILE.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {buttonElement !== null && (
        <Button
          onClick={() => setIsOpen(true)}
          className={buttonClassName}
          data-link-oso-button={dataAttr}
        >
          <FingerPrintIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          Link OSO Profiles
        </Button>
      )}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleClose}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      Link OSO Profiles
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Add one or more OSO profile IDs for the project. This will
                      enable the project to retrieve its OSO profile metrics.
                    </p>
                  </Dialog.Title>
                  <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
                    {ids.map((id, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg flex-grow">
                          <div className="flex items-center space-x-4 w-full">
                            <span className="text-md font-bold capitalize whitespace-nowrap">
                              OSO Profile {index + 1}
                            </span>
                            <input
                              type="text"
                              value={id}
                              onChange={(e) =>
                                handleIdChange(index, e.target.value)
                              }
                              className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                              placeholder="Enter OSO profile ID"
                            />
                          </div>
                        </div>
                        {ids.length > 1 && (
                          <Button
                            onClick={() => handleRemoveId(index)}
                            className="p-2 text-red-500 hover:text-red-700"
                            aria-label="Remove ID"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleAddId}
                      className="flex items-center justify-center text-white gap-2 border border-primary-500 bg-primary-500 hover:bg-primary-600"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Another ID
                    </Button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="bg-primary-500 text-white hover:bg-primary-600"
                    >
                      {isLoading ? "Saving..." : "Save All"}
                    </Button>
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={handleClose}
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
    </>
  );
};

export default LinkOSOProfileButton;
