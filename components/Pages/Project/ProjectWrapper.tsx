"use client";
import { ProgressDialog } from "@/components/Dialogs/ProgressDialog";
import {
  DiscordIcon,
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
  WebsiteIcon,
} from "@/components/Icons";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { ProjectNavigator } from "@/components/Pages/Project/ProjectNavigator";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useGap } from "@/hooks";
import { useOwnerStore, useProjectStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { IntroDialog } from "./IntroDialog";

import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";

interface ProjectWrapperProps {
  project: IProjectResponse;
  projectId: string;
}
export const ProjectWrapper = ({ projectId, project }: ProjectWrapperProps) => {
  const {
    refreshMembers,
    setProjectContactsInfo,
    projectContactsInfo,
    setContactInfoLoading,
    setProject,
    isProjectAdmin,
    setIsProjectAdmin,
    setIsProjectAdminLoading,
    isProjectOwner,
    setIsProjectOwner,
    setIsProjectOwnerLoading,
  } = useProjectStore((state) => state);

  const router = useRouter();

  useEffect(() => {
    setProject(project);
  }, [project]);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner;

  useEffect(() => {
    if (!projectId || !isAuthorized) return;
    const getContactInfo = async () => {
      setContactInfoLoading(true);
      try {
        const [data, error] = await fetchData(
          INDEXER.SUBSCRIPTION.GET(projectId),
          "GET",
          {},
          {},
          {},
          true
        );
        if (error) {
          throw error;
        }

        setProjectContactsInfo(data);
      } catch (error: any) {
        console.error(error);
        setProjectContactsInfo(undefined);
        errorManager(
          `Error fetching project contacts info from project ${projectId}`,
          error
        );
      } finally {
        setContactInfoLoading(false);
      }
    };
    getContactInfo();
  }, [projectId, isAuthorized]);

  useEffect(() => {
    if (!project) return;
    refreshMembers();
  }, [project]);

  const hasContactInfo = Boolean(projectContactsInfo?.length);

  const signer = useSigner();
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { isAuth } = useAuthStore();
  const { gap } = useGap();

  useEffect(() => {
    if (!project || !project?.chainID || !isAuth || !isConnected || !chain) {
      setIsProjectAdmin(false);
      setIsProjectAdminLoading(false);
      setIsProjectOwner(false);
      setIsProjectOwnerLoading(false);
      return;
    }

    const setupProjectOwner = async () => {
      try {
        setIsProjectOwnerLoading(true);
        const walletClient = await getWalletClient(config, {
          chainId: project.chainID,
        }).catch(() => undefined);

        if (!walletClient) return;
        const walletSigner = await walletClientToSigner(walletClient).catch(
          () => undefined
        );
        const fetchedProject = await getProjectById(projectId);
        if (!fetchedProject) return;
        await fetchedProject
          .isOwner(walletSigner || signer)
          .then((res) => {
            setIsProjectOwner(res);
          })
          .finally(() => setIsProjectOwnerLoading(false));
      } catch (error: any) {
        setIsProjectOwner(false);
        errorManager(
          `Error checking if user ${address} is project owner from project ${projectId}`,
          error
        );
      } finally {
        setIsProjectOwnerLoading(false);
      }
    };
    setupProjectOwner();
    const setupProjectAdmin = async () => {
      try {
        setIsProjectAdminLoading(true);
        const walletClient = await getWalletClient(config, {
          chainId: project.chainID,
        }).catch(() => undefined);

        if (!walletClient) return;
        const walletSigner = await walletClientToSigner(walletClient).catch(
          () => undefined
        );
        const fetchedProject = await getProjectById(projectId);
        if (!fetchedProject) return;
        await fetchedProject
          .isAdmin(walletSigner || signer)
          .then((res) => {
            setIsProjectAdmin(res);
          })
          .finally(() => setIsProjectAdminLoading(false));
      } catch (error: any) {
        setIsProjectAdmin(false);
        errorManager(
          `Error checking if user ${address} is project admin from project ${projectId}`,
          error
        );
      } finally {
        setIsProjectAdminLoading(false);
      }
    };
    setupProjectAdmin();
  }, [project?.uid, address, isAuth, isConnected, signer, chain]);

  const socials = useMemo(() => {
    const types = [
      { name: "Twitter", prefix: "twitter.com/", icon: TwitterIcon },
      { name: "Github", prefix: "github.com/", icon: GithubIcon },
      { name: "Discord", prefix: "discord.gg/", icon: DiscordIcon },
      { name: "Website", prefix: "https://", icon: WebsiteIcon },
      { name: "LinkedIn", prefix: "linkedin.com/", icon: LinkedInIcon },
    ];

    const hasHttpOrWWW = (link?: string) => {
      if (!link) return false;
      if (
        link.includes("http://") ||
        link.includes("https://") ||
        link.includes("www.")
      ) {
        return true;
      }
      return false;
    };

    const addPrefix = (link: string) => `https://${link}`;

    const formatPrefix = (prefix: string, link: string) => {
      const firstWWW = link.slice(0, 4) === "www.";
      if (firstWWW) {
        return addPrefix(link);
      }
      const alreadyHasPrefix = link.includes(prefix);
      if (alreadyHasPrefix) {
        if (hasHttpOrWWW(link)) {
          return link;
        }
        return addPrefix(link);
      }

      return hasHttpOrWWW(prefix + link)
        ? prefix + link
        : addPrefix(prefix + link);
    };

    return types
      .map(({ name, prefix, icon }) => {
        const socialLink = project?.details?.data?.links?.find(
          (link) => link.type === name.toLowerCase()
        )?.url;

        if (socialLink) {
          if (name === "Twitter") {
            const url = socialLink?.includes("@")
              ? socialLink?.replace("@", "") || ""
              : socialLink;

            return {
              name,
              url: formatPrefix(prefix, url),
              icon,
            };
          }

          return {
            name,
            url: formatPrefix(prefix, socialLink),
            icon,
          };
        }

        return undefined;
      })
      .filter((social) => social);
  }, [project]);

  const hasAlreadyEndorsed = project?.endorsements?.find(
    (item) => item.recipient?.toLowerCase() === address?.toLowerCase()
  );
  const { openConnectModal } = useConnectModal();
  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();

  const handleEndorse = () => {
    if (!isConnected || !isAuth) {
      return (
        <Button
          className="hover:bg-white dark:hover:bg-black border border-black bg-white text-black dark:bg-black dark:text-white px-4 rounded-md py-2 w-max"
          onClick={() => {
            if (!isConnecting) {
              openConnectModal?.();
            }
          }}
        >
          Endorse this project
        </Button>
      );
    }
    if (!hasAlreadyEndorsed) {
      return (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
            "hover:bg-white dark:hover:bg-black border border-black bg-white text-black dark:bg-black dark:text-white px-4 rounded-md py-2 w-max"
          )}
        >
          Endorse this project
        </Button>
      );
    }
    return null;
  };

  interface Member {
    uid: string;
    recipient: string;
    details?: {
      name?: string;
    };
  }

  const mountMembers = () => {
    const members: Member[] = [];
    if (project?.members) {
      project.members.forEach((member) => {
        members.push({
          uid: member.uid,
          recipient: member.recipient,
          details: {
            name: member?.details?.name,
          },
        });
      });
    }
    const alreadyHasOwner = project?.members.find(
      (member) => member.recipient === project.recipient
    );
    if (!alreadyHasOwner) {
      members.push({
        uid: project?.recipient || "",
        recipient: project?.recipient || "",
      });
    }

    return members;
  };

  useEffect(() => {
    if (project && project?.pointers?.length > 0) {
      gap?.fetch
        ?.projectById(project.pointers[0].data?.ogProjectUID)
        .then((_project) => {
          if (_project) {
            router.push(`/project/${_project?.details?.data?.slug}`);
          }
        });
    }
  }, [project]);

  const members = mountMembers();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isEndorsementOpen } = useEndorsementStore();
  const { isProgressModalOpen } = useProgressModalStore();

  return (
    <>
      {isIntroModalOpen ? <IntroDialog /> : null}
      {isEndorsementOpen ? <EndorsementDialog /> : null}
      {isProgressModalOpen ? <ProgressDialog /> : null}

      <div className="relative border-b border-gray-200 ">
        <div className="px-4 sm:px-6 lg:px-12 lg:flex py-5 lg:items-start lg:justify-between flex flex-row max-lg:flex-col max-lg:justify-center max-lg:items-center gap-4">
          <div className="flex flex-col gap-4">
            <h1
              className={
                "text-[32px] font-bold leading-tight text-black dark:text-zinc-100 line-clamp-2"
              }
            >
              {project?.details?.data?.title}
            </h1>
            {project?.details?.data?.tags?.length ? (
              <div className="flex flex-col gap-2 max-md:hidden">
                <div className="flex items-center gap-x-1">
                  {project?.details?.data?.tags?.map((tag) => (
                    <span
                      key={tag.name}
                      className="rounded bg-gray-100 px-2 py-1 text-sm  font-normal text-slate-700"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 items-end justify-end">
            <div className="flex flex-row gap-6 max-lg:flex-col  max-lg:gap-3">
              <div className="flex flex-row gap-10 max-lg:gap-4 flex-wrap max-lg:flex-col items-center max-lg:justify-center">
                {socials.length > 0 && (
                  <div className="flex flex-row gap-4 items-center">
                    {socials
                      .filter((social) => social?.url)
                      .map((social, index) => (
                        <a
                          key={social?.url || index}
                          href={social?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {social?.icon && (
                            <social.icon className="h-5 w-5 fill-black text-black dark:text-white dark:fill-zinc-200" />
                          )}
                        </a>
                      ))}
                  </div>
                )}
                {/* <div className="flex flex-col gap-2 items-center">
              {handleEndorse()}
              {project ? <ProjectSubscriptionDialog project={project} /> : null}
            </div> */}
              </div>
              {isProjectAdmin ? (
                <ExternalLink
                  href={"https://tally.so/r/w8e6GP"}
                  className="bg-black dark:bg-zinc-800 text-white justify-center items-center dark:text-zinc-400 flex flex-row gap-2.5 py-2 px-5 rounded-full w-max min-w-max"
                >
                  <Image
                    src="/icons/alert.png"
                    alt="Looking for help"
                    className="w-5 h-5"
                    width={20}
                    height={20}
                  />
                  <p>
                    Are you <b>looking for help?</b>
                  </p>
                </ExternalLink>
              ) : null}
            </div>
            {members.length ? (
              <div className="flex items-center justify-end w-full flex-wrap gap-4 max-lg:hidden">
                <p className="text-base font-normal text-black dark:text-slate-200">
                  Built by
                </p>
                <div className="flex flex-row gap-0 w-max">
                  {Array.from(
                    new Set(members.map((member) => member.recipient))
                  ).map((member, index) => (
                    <span
                      key={index}
                      className="-ml-1.5"
                      style={{ zIndex: 1 + index }}
                    >
                      <EthereumAddressToENSAvatar
                        address={member}
                        className="h-5 w-5 rounded-full border border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                      />
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 max-sm:px-4">
          <div className="sm:px-6 lg:px-12  sm:block">
            <ProjectNavigator
              hasContactInfo={hasContactInfo}
              grantsLength={project?.grants?.length || 0}
            />
          </div>
        </div>
      </div>
    </>
  );
};
