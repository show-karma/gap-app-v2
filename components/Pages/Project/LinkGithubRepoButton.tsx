"use client";

import { Dialog, Transition } from "@headlessui/react";
import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";

// GitHub icon SVG component
const GitHubIcon: FC<{ className?: string }> = ({ className }) => (
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
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface LinkGithubRepoButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
  "data-link-github-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

export const LinkGithubRepoButton: FC<LinkGithubRepoButtonProps> = ({
  project,
  buttonClassName,
  "data-link-github-button": dataAttr,
  buttonElement,
  onClose,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [validatingRepo, setValidatingRepo] = useState<number | null>(null);
  const [validatedRepos, setValidatedRepos] = useState<Record<number, boolean>>(
    {}
  );
  const { refreshProject } = useProjectStore();

  // Auto open the dialog if buttonElement is null
  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  useEffect(() => {
    if (project?.external?.github?.length) {
      setRepos(project.external.github);
      // Mark existing repos as needing validation
      const initialValidationState: Record<number, boolean> = {};
      project.external.github.forEach((_, index) => {
        initialValidationState[index] = false;
      });
      setValidatedRepos(initialValidationState);
    } else {
      setRepos([""]);
      setValidatedRepos({});
    }
  }, [project?.external?.github]);

  const handleAddRepo = () => {
    setRepos([...repos, ""]);
    // New repo is not validated
    setValidatedRepos((prev) => ({ ...prev, [repos.length]: false }));
  };

  const handleRemoveRepo = (index: number) => {
    const newRepos = repos.filter((_, i) => i !== index);
    if (newRepos.length === 0) {
      setRepos([""]);
      setValidatedRepos({});
    } else {
      setRepos(newRepos);

      // Update validation state by removing the deleted index and shifting others
      const newValidatedRepos: Record<number, boolean> = {};
      let newIndex = 0;

      for (let i = 0; i < repos.length; i++) {
        if (i !== index) {
          newValidatedRepos[newIndex] = validatedRepos[i] || false;
          newIndex++;
        }
      }

      setValidatedRepos(newValidatedRepos);
    }

    // Remove any validation errors for this index
    const newValidationErrors = { ...validationErrors };
    delete newValidationErrors[index];
    setValidationErrors(newValidationErrors);
  };

  const handleRepoChange = (index: number, value: string) => {
    const newRepos = [...repos];
    newRepos[index] = value;
    setRepos(newRepos);

    // Clear validation status and errors when user changes the URL
    setValidatedRepos((prev) => ({ ...prev, [index]: false }));

    if (validationErrors[index]) {
      const newValidationErrors = { ...validationErrors };
      delete newValidationErrors[index];
      setValidationErrors(newValidationErrors);
    }
  };

  const validateGithubRepo = async (repo: string, index: number) => {
    if (!repo) {
      return false;
    }

    // Basic URL validation
    let repoUrl: URL;
    try {
      repoUrl = new URL(repo);
      if (!repoUrl.hostname.includes("github.com")) {
        setValidationErrors((prev) => ({
          ...prev,
          [index]: "Not a valid GitHub URL",
        }));
        setValidatedRepos((prev) => ({ ...prev, [index]: false }));
        return false;
      }
    } catch (e) {
      setValidationErrors((prev) => ({
        ...prev,
        [index]: "Invalid URL format",
      }));
      setValidatedRepos((prev) => ({ ...prev, [index]: false }));
      return false;
    }

    // Extract owner and repo name from URL
    const pathParts = repoUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      setValidationErrors((prev) => ({
        ...prev,
        [index]: "Invalid GitHub repository URL",
      }));
      setValidatedRepos((prev) => ({ ...prev, [index]: false }));
      return false;
    }

    const owner = pathParts[0];
    const repoName = pathParts[1];

    // Check if repo exists and is public
    setValidatingRepo(index);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: "Repository not found or private",
          }));
        } else {
          setValidationErrors((prev) => ({
            ...prev,
            [index]: `GitHub API error: ${response.statusText}`,
          }));
        }
        setValidatedRepos((prev) => ({ ...prev, [index]: false }));
        return false;
      }

      const repoData = await response.json();
      if (repoData.private) {
        setValidationErrors((prev) => ({
          ...prev,
          [index]:
            "Repository is private. Only public repositories are supported.",
        }));
        setValidatedRepos((prev) => ({ ...prev, [index]: false }));
        return false;
      }

      // Mark as validated
      setValidatedRepos((prev) => ({ ...prev, [index]: true }));

      // Clear any validation errors
      if (validationErrors[index]) {
        const newValidationErrors = { ...validationErrors };
        delete newValidationErrors[index];
        setValidationErrors(newValidationErrors);
      }

      return true;
    } catch (err) {
      console.error("Error validating GitHub repo:", err);
      setValidationErrors((prev) => ({
        ...prev,
        [index]: "Failed to validate repository",
      }));
      setValidatedRepos((prev) => ({ ...prev, [index]: false }));
      return false;
    } finally {
      setValidatingRepo(null);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    // Filter out empty repos
    const nonEmptyRepos = repos.filter((repo) => repo.trim() !== "");

    // Check if all non-empty repos are validated
    const allValidated = nonEmptyRepos.every(
      (_, index) => validatedRepos[index]
    );

    if (!allValidated) {
      setError("Please validate all repositories before saving.");
      setIsLoading(false);
      return;
    }

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "github",
          ids: nonEmptyRepos,
        }
      );

      if (data) {
        setRepos(nonEmptyRepos.length ? nonEmptyRepos : [""]);
        toast.success("GitHub repositories updated successfully");
        if (buttonElement === null && onClose) {
          setIsOpen(false);
          onClose();
        }
        refreshProject();
      }

      if (error) {
        setError(`Failed to update GitHub repositories. Please try again.`);
        throw new Error("Failed to update GitHub repositories.");
      }
    } catch (err) {
      errorManager(
        MESSAGES.PROJECT.LINK_GITHUB_REPOS.ERROR,
        err,
        {
          projectUID: project.uid,
          target: "github",
          ids: nonEmptyRepos,
          address,
        },
        { error: MESSAGES.PROJECT.LINK_GITHUB_REPOS.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Check if all non-empty repos are validated
  const areAllReposValidated = () => {
    return repos
      .filter((repo) => repo.trim() !== "")
      .every((_, index) => validatedRepos[index]);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
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
          data-link-github-button={dataAttr}
        >
          <GitHubIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          Link GitHub Repo
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-4 sm:p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      Link GitHub Repositories
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Add one or more GitHub repository URLs for the project.
                      Only public repositories are supported.
                    </p>
                  </Dialog.Title>
                  <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
                    {repos.map((repo, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg flex-grow gap-2 sm:gap-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
                              <span className="text-md font-bold capitalize whitespace-nowrap">
                                Repository {index + 1}
                              </span>
                              <input
                                type="text"
                                value={repo}
                                onChange={(e) =>
                                  handleRepoChange(index, e.target.value)
                                }
                                className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                                placeholder="https://github.com/username/repository"
                              />
                            </div>
                            <div className="flex items-center self-end sm:self-auto mt-2 sm:mt-0">
                              {validatingRepo === index ? (
                                <span className="text-sm animate-pulse mx-2">
                                  Validating...
                                </span>
                              ) : validatedRepos[index] ? (
                                <div className="relative group">
                                  <CheckIcon
                                    className="h-9 w-10 text-green-500 p-2 mx-1 border border-green-500 rounded-md"
                                    aria-label="Validated"
                                  />
                                  <div className="absolute bottom-1/2 right-full transform translate-y-1/2 mr-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    This is a valid GitHub repo
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  onClick={() =>
                                    validateGithubRepo(repo, index)
                                  }
                                  className="p-2 ml-2"
                                  aria-label="Validate repository"
                                  disabled={!repo.trim()}
                                >
                                  Validate
                                </Button>
                              )}
                              {repos.length > 1 && (
                                <Button
                                  onClick={() => handleRemoveRepo(index)}
                                  className="p-2 border border-red-500 bg-white text-red-500 rounded-md"
                                  aria-label="Remove repository"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {validationErrors[index] && (
                          <p className="text-red-500 text-sm mt-1 ml-4">
                            {validationErrors[index]}
                          </p>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleAddRepo}
                      className="flex items-center justify-center gap-2 border border-primary-500"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Another Repository
                    </Button>
                    {error && (
                      <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={
                        isLoading ||
                        Object.keys(validationErrors).length > 0 ||
                        !areAllReposValidated()
                      }
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? "Saving..." : "Save All"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleClose}
                      type="button"
                      className="w-full sm:w-auto"
                    >
                      Cancel
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

// Add display name
LinkGithubRepoButton.displayName = "LinkGithubRepoButton";
