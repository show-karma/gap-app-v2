"use client";
import { cn } from "@/utilities/tailwind";
import { useAuthStore } from "@/store/auth";
import { getWalletClient } from "@wagmi/core";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { Button } from "@/components/Utilities/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ProjectSubscriptionDialog } from "@/components/Pages/Project/ProjectSubscription";
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

interface ProjectWrapperProps {
  project: IProjectResponse;
  projectId: string;
}
export const ProjectWrapper = ({ projectId, project }: ProjectWrapperProps) => {
  const setProject = useProjectStore((state) => state.setProject);
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
        <EndorsementDialog
          buttonElement={{
            text: "Endorse this project",
            styleClass:
              "hover:bg-white dark:hover:bg-black border border-black bg-white text-black dark:bg-black dark:text-white px-4 rounded-md py-2 w-max",
          }}
        />
      );
    }
    return null;
  };
  return (
    <div className="relative border-b border-gray-200 ">
      <div className="px-4 sm:px-6 lg:px-12 md:flex py-5 md:items-start md:justify-between flex flex-row max-lg:flex-col gap-4">
        <h1
          className={
            "text-[32px] font-bold leading-tight text-black dark:text-zinc-100"
          }
        >
          {project?.details?.data?.title}
        </h1>
        <div className="flex flex-row gap-10 max-lg:gap-4 flex-wrap max-lg:flex-col items-center max-lg:items-start">
          {socials.length > 0 && (
            <div className="flex flex-row gap-3 items-center">
              <p className="text-base font-normal leading-tight text-black dark:text-zinc-200 max-lg:hidden">
                Socials
              </p>
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
            </div>
          )}
          <div className="flex flex-col gap-2 items-center">
            {handleEndorse()}
            {project ? <ProjectSubscriptionDialog project={project} /> : null}
          </div>
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
  );
};
