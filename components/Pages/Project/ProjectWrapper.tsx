"use client";
import { cn } from "@/utilities/tailwind";
import { useAuthStore } from "@/store/auth";
import { getWalletClient } from "@wagmi/core";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { Button } from "@/components/Utilities/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { config } from "@/utilities/wagmi/config";
import { INDEXER } from "@/utilities/indexer";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useEffect, useMemo } from "react";
import { useProjectStore } from "@/store";
import { useAccount } from "wagmi";
import {
  DiscordIcon,
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
  WebsiteIcon,
} from "@/components/Icons";
import fetchData from "@/utilities/fetchData";
import { getProjectById, getProjectOwner } from "@/utilities/sdk";
import { ProjectNavigator } from "@/components/Pages/Project/ProjectNavigator";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import Image from "next/image";
import { blo } from "blo";
import { IntroDialog } from "./IntroDialog";
import { useIntroModalStore } from "@/store/modals/intro";

interface ProjectWrapperProps {
  project: IProjectResponse;
  projectId: string;
}
export const ProjectWrapper = ({ projectId, project }: ProjectWrapperProps) => {
  const setProject = useProjectStore((state) => state.setProject);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
  const setIsProjectOwnerLoading = useProjectStore(
    (state) => state.setIsProjectOwnerLoading
  );

  const setProjectContactsInfo = useProjectStore(
    (state) => state.setProjectContactsInfo
  );
  const projectContactsInfo = useProjectStore(
    (state) => state.projectContactsInfo
  );
  const setContactInfoLoading = useProjectStore(
    (state) => state.setContactInfoLoading
  );

  useEffect(() => {
    setProject(project);
  }, [project]);

  useEffect(() => {
    if (!projectId) return;
    const getContactInfo = async () => {
      setContactInfoLoading(true);
      try {
        const [data] = await fetchData(
          INDEXER.SUBSCRIPTION.GET(projectId),
          "GET",
          {},
          {},
          {},
          true
        );

        setProjectContactsInfo(data);
      } catch (error) {
        console.error(error);
        setProjectContactsInfo(undefined);
      } finally {
        setContactInfoLoading(false);
      }
    };
    getContactInfo();
  }, [projectId]);

  const hasContactInfo = Boolean(projectContactsInfo?.length);

  const signer = useSigner();
  const { address, isConnected, isConnecting } = useAccount();
  const { isAuth } = useAuthStore();

  useEffect(() => {
    if (!project || !project?.chainID || !isAuth || !isConnected) {
      setIsProjectOwner(false);
      setIsProjectOwnerLoading(false);
      return;
    }

    const setupOwner = async () => {
      try {
        setIsProjectOwnerLoading(true);
        const walletClient = await getWalletClient(config, {
          chainId: project.chainID,
        });
        if (!walletClient) return;
        const walletSigner = await walletClientToSigner(walletClient).catch(
          () => undefined
        );
        const fetchedProject = await getProjectById(projectId);
        if (!fetchedProject) return;
        await getProjectOwner(walletSigner || signer, fetchedProject)
          .then((res) => {
            setIsProjectOwner(res);
          })
          .finally(() => setIsProjectOwnerLoading(false));
      } catch {
        setIsProjectOwner(false);
      } finally {
        setIsProjectOwnerLoading(false);
      }
    };
    setupOwner();
  }, [project?.uid, address, isAuth, isConnected, signer]);

  const socials = useMemo(() => {
    const types = [
      { name: "Twitter", prefix: "twitter.com/", icon: TwitterIcon },
      { name: "Github", prefix: "github.com/", icon: GithubIcon },
      { name: "Discord", prefix: "discord.gg/", icon: DiscordIcon },
      { name: "Website", prefix: "https://", icon: WebsiteIcon },
      { name: "LinkedIn", prefix: "linkedin.com/", icon: LinkedInIcon },
    ];

    const isLink = (link?: string) => {
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
        if (isLink(link)) {
          return link;
        }
        return addPrefix(link);
      }

      return isLink(prefix + link) ? prefix + link : addPrefix(prefix + link);
    };

    return types
      .map(({ name, prefix, icon }) => {
        const hasUrl = project?.details?.data?.links?.find(
          (link) => link.type === name.toLowerCase()
        )?.url;

        if (hasUrl) {
          if (name === "Twitter") {
            const hasAt = hasUrl?.includes("@");
            const url = hasAt ? hasUrl?.replace("@", "") || "" : hasUrl;
            return {
              name,
              url: isLink(hasUrl)
                ? hasUrl
                : hasUrl.includes(prefix)
                ? addPrefix(url)
                : prefix + url,
              icon,
            };
          }

          return {
            name,
            url: formatPrefix(prefix, hasUrl),
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

  const members = mountMembers();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isEndorsementOpen } = useEndorsementStore();
  return (
    <>
      {isIntroModalOpen ? <IntroDialog /> : null}
      {isEndorsementOpen ? <EndorsementDialog /> : null}

      <div className="relative border-b border-gray-200 ">
        <div className="px-4 sm:px-6 lg:px-12 lg:flex py-5 lg:items-start lg:justify-between flex flex-row max-lg:flex-col max-lg:justify-center max-lg:items-center gap-4">
          <div className="flex flex-col gap-4">
            <h1
              className={
                "text-[32px] font-bold leading-tight text-black dark:text-zinc-100"
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
              {isProjectOwner ? (
                <ExternalLink
                  href={"https://tally.so/r/w8e6GP"}
                  className="bg-black dark:bg-zinc-800 text-white justify-center items-center dark:text-zinc-400 flex flex-row gap-2.5 py-2 px-5 rounded-full"
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
                  {members.map((member, index) => (
                    <span
                      key={index}
                      className="-ml-1.5"
                      style={{ zIndex: 1 + index }}
                    >
                      <Image
                        width={20}
                        height={20}
                        src={blo(member.recipient as `0x${string}`, 8)}
                        alt={member.recipient}
                        className="h-5 w-5 rounded-full border border-gray-100 dark:border-zinc-9000 sm:h-5 sm:w-5"
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
