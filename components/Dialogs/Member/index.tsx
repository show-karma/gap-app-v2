import { FC, Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { Twitter2Icon } from "@/components/Icons/Twitter2";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { GithubIcon, LinkedInIcon } from "@/components/Icons";
import { FarcasterIcon } from "@/components/Icons/Farcaster";

interface MemberDialogProps {
  profile: ContributorProfile;
  buttonText: string;
  buttonClassName?: string;
}

const iconsClassnames = {
  light: "text-black dark:text-white dark:hidden ",
  dark: "text-black dark:text-white hidden dark:block ",
  general:
    "w-6 h-6 text-black dark:text-white  hover:text-zinc-400 dark:hover:text-zinc-400",
};

export const MemberDialog: FC<MemberDialogProps> = ({
  profile,
  buttonText,
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const data = [
    {
      title: "Name",
      value: profile?.data.name,
    },
    {
      title: "About me",
      value: profile?.data.aboutMe,
    },
  ];

  return (
    <>
      <button className={buttonClassName} onClick={openModal}>
        {buttonText}
      </button>
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
                  <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                    <div className="flex flex-row gap-2 justify-between">
                      <h3 className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100">
                        Contributor Profile
                      </h3>
                      <div className="flex flex-row gap-2">
                        {profile?.data.twitter ? (
                          <ExternalLink
                            href={
                              profile?.data.twitter.includes("http")
                                ? profile?.data.twitter
                                : profile?.data.twitter.includes(
                                    "twitter.com"
                                  ) || profile?.data.twitter.includes("x.com")
                                ? `https://${profile?.data.twitter}`
                                : `https://x.com/${profile?.data.twitter}`
                            }
                            className="w-max"
                          >
                            <Twitter2Icon className={iconsClassnames.general} />
                          </ExternalLink>
                        ) : null}
                        {profile?.data.github ? (
                          <ExternalLink
                            href={
                              profile?.data.github.includes("http")
                                ? profile?.data.github
                                : profile?.data.github.includes("github.com")
                                ? `https://${profile?.data.github}`
                                : `https://github.com/${profile?.data.github}`
                            }
                            className="w-max"
                          >
                            <GithubIcon className={iconsClassnames.general} />
                          </ExternalLink>
                        ) : null}
                        {profile?.data.linkedin ? (
                          <ExternalLink
                            href={
                              profile?.data.linkedin.includes("http")
                                ? profile?.data.linkedin
                                : profile?.data.linkedin.includes(
                                    "linkedin.com"
                                  )
                                ? `https://${profile?.data.linkedin}`
                                : `https://linkedin.com/in/${profile?.data.linkedin}`
                            }
                            className="w-max"
                          >
                            <LinkedInIcon className={iconsClassnames.general} />
                          </ExternalLink>
                        ) : null}
                        {profile?.data.farcaster ? (
                          <ExternalLink
                            href={
                              profile?.data.farcaster.includes("http")
                                ? profile?.data.farcaster
                                : profile?.data.farcaster.includes(
                                    "warpcast.com"
                                  )
                                ? `https://${profile?.data.farcaster}`
                                : `https://warpcast.com/${profile?.data.farcaster}`
                            }
                            className="w-max"
                          >
                            <FarcasterIcon
                              className={iconsClassnames.general}
                            />
                          </ExternalLink>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-col gap-2">
                        {data.map((item, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <div className="font-bold text-base text-gray-900 dark:text-zinc-100">
                              {item.title}
                            </div>
                            <div className="text-base text-zinc-900 dark:text-zinc-200">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 flex flex-row gap-2 justify-end">
                      <Button
                        className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white"
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
      ) : null}
    </>
  );
};
