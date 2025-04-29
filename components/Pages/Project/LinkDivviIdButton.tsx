"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { Dialog, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";

// Divvi icon SVG component
const DivviIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    <path d="M11 7h2v8h-2zm0 10h2v-2h-2z" />
  </svg>
);

interface LinkDivviIdButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
}

export const LinkDivviIdButton: FC<LinkDivviIdButtonProps> = ({
  project,
  buttonClassName,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;

  const [isOpen, setIsOpen] = useState(false);
  const [divviId, setDivviId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (project?.external?.divvi?.length) {
      setDivviId(project.external.divvi[0]);
    } else {
      setDivviId("");
    }
  }, [project?.external?.divvi]);

  const handleDivviIdChange = (value: string) => {
    setDivviId(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "divvi",
          ids: [divviId.trim()],
        }
      );

      if (data) {
        toast.success(MESSAGES.PROJECT.LINK_DIVVI_ID.SUCCESS);
        setIsOpen(false);
      }

      if (error) {
        setError(`Failed to update Divvi ID. Please try again.`);
        throw new Error("Failed to update Divvi ID.");
      }
    } catch (err) {
      errorManager(
        MESSAGES.PROJECT.LINK_DIVVI_ID.ERROR,
        err,
        { projectUID: project.uid },
        { error: MESSAGES.PROJECT.LINK_DIVVI_ID.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "divvi",
          ids: [],
        }
      );

      if (data) {
        setDivviId("");
        toast.success(MESSAGES.PROJECT.LINK_DIVVI_ID.SUCCESS);
        setIsOpen(false);
      }

      if (error) {
        setError(`Failed to remove Divvi ID. Please try again.`);
        throw new Error("Failed to remove Divvi ID.");
      }
    } catch (err) {
      errorManager(
        MESSAGES.PROJECT.LINK_DIVVI_ID.ERROR,
        err,
        { projectUID: project.uid },
        { error: MESSAGES.PROJECT.LINK_DIVVI_ID.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized || !mounted) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={buttonClassName}>
        <DivviIcon className="mr-2 h-5 w-5" />
        Link Divvi ID
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsOpen(false)}
        >
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      Link Divvi ID
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Connect your Divvi ID to this project.
                    </p>
                  </Dialog.Title>
                  <div className="mt-8">
                    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                      <div className="flex items-center space-x-4 w-full">
                        <span className="text-md font-bold whitespace-nowrap">
                          Divvi ID
                        </span>
                        <input
                          type="text"
                          value={divviId}
                          onChange={(e) => handleDivviIdChange(e.target.value)}
                          className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                          placeholder="Enter your Divvi ID"
                        />
                      </div>
                      {divviId && project?.external?.divvi?.length > 0 && (
                        <Button
                          onClick={handleRemove}
                          className="p-2 border border-red-500 bg-white text-red-500 rounded-md ml-2"
                          aria-label="Remove Divvi ID"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm mt-4">{error}</p>
                    )}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading || !divviId.trim()}
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={() => setIsOpen(false)}
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