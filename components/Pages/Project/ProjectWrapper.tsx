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
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useOwnerStore, useProjectStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  IProjectDetails,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Image from "next/image";

import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { IntroDialog } from "./IntroDialog";

import { getRPCClient } from "@/utilities/rpcClient";
import { useContactInfo } from "@/hooks/useContactInfo";
import { FarcasterIcon } from "@/components/Icons/Farcaster";
import { ShareDialog } from "../GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog";
import { useShareDialogStore } from "@/store/modals/shareDialog";

interface ProjectWrapperProps {
  project: IProjectResponse;
  projectId: string;
}
export const ProjectWrapper = ({ projectId, project }: ProjectWrapperProps) => {
  const {
    refreshMembers,
    setProject,
    isProjectAdmin,
    setIsProjectAdmin,
    setIsProjectAdminLoading,
    isProjectOwner,
    setIsProjectOwner,
    setIsProjectOwnerLoading,
    project: storedProject,
  } = useProjectStore((state) => state);

  // Only update the store if the project data has changed
  useEffect(() => {
    if (!storedProject || storedProject.uid !== project.uid) {
      setProject(project);
    }
  }, [project, storedProject, setProject]);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner;

  // Refresh team members when project changes
  useEffect(() => {
    if (project && (!storedProject || storedProject.uid !== project.uid)) {
      refreshMembers();
    }
  }, [project, storedProject, refreshMembers]);

  const { data: contactsInfo } = useContactInfo(projectId, isAuthorized);

  const hasContactInfo = Boolean(contactsInfo?.length);

  const signer = useSigner();
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { isAuth } = useAuthStore();

  // Setup project permissions (owner/admin checks)
  useEffect(() => {
    if (!project || !project?.chainID || !isAuth || !isConnected || !address) {
      setIsProjectAdmin(false);
      setIsProjectAdminLoading(false);
      setIsProjectOwner(false);
      setIsProjectOwnerLoading(false);
      return;
    }

    const setupProjectPermissions = async () => {
      try {
        setIsProjectOwnerLoading(true);
        setIsProjectAdminLoading(true);
        
        const rpcClient = await getRPCClient(project.chainID);
        const fetchedProject = await getProjectById(projectId);
        
        if (!fetchedProject) return;

        // Check both owner and admin status in parallel
        const [isOwnerResult, isAdminResult] = await Promise.all([
          fetchedProject.isOwner(rpcClient as any, address).catch(() => false),
          fetchedProject.isAdmin(rpcClient as any, address).catch(() => false),
        ]);

        setIsProjectOwner(isOwnerResult);
        setIsProjectAdmin(isAdminResult);
      } catch (error: any) {
        setIsProjectOwner(false);
        setIsProjectAdmin(false);
        errorManager(
          `Error checking user permissions for project ${projectId}`,
          error
        );
      } finally {
        setIsProjectOwnerLoading(false);
        setIsProjectAdminLoading(false);
      }
    };

    setupProjectPermissions();
  }, [project?.uid, address, isAuth, isConnected, signer]);

  const { setIsEndorsementOpen } = useEndorsementStore();

  const links = useMemo(() => {
    if (!project?.details?.data?.links) return [];

    return project.details.data.links.filter(
      (link) => link.url && link.url.trim() !== ""
    );
  }, [project?.details?.data?.links]);

  const getLinkIcon = (type: string) => {
    const iconProps = { className: "w-6 h-6" };
    switch (type) {
      case "twitter":
        return <TwitterIcon {...iconProps} />;
      case "github":
        return <GithubIcon {...iconProps} />;
      case "discord":
        return <DiscordIcon {...iconProps} />;
      case "linkedin":
        return <LinkedInIcon {...iconProps} />;
      case "website":
        return <WebsiteIcon {...iconProps} />;
      case "farcaster":
        return <FarcasterIcon {...iconProps} />;
      default:
        return <WebsiteIcon {...iconProps} />;
    }
  };

  const { openConnectModal } = useConnectModal();
  const { openShareDialog } = useShareDialogStore();

  return (
    <>
      <ProgressDialog />
      <EndorsementDialog />
      <IntroDialog />
      <ShareDialog />
      <div className="relative border-b border-gray-200 ">
        <div className="px-4 sm:px-6 lg:px-12 lg:flex py-5 lg:items-start lg:justify-between flex flex-row max-lg:flex-col max-lg:justify-center max-lg:items-center gap-4">
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-4 max-lg:flex-col max-lg:items-center max-lg:justify-center max-lg:text-center">
              <div className="flex justify-center">
                <ProfilePicture
                  imageURL={project?.details?.data?.imageURL}
                  name={project?.details?.data?.title || ""}
                  size="64"
                  className="h-16 w-16 border border-white shadow-md"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-zinc-100 sm:text-3xl">
                  {project?.details?.data?.title}
                </h1>
                <div className="flex flex-row gap-4 items-center max-lg:justify-center max-lg:flex-wrap">
                  {links.slice(0, 5).map((link, index) => (
                    <ExternalLink
                      key={index}
                      href={link.url}
                      className="text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-all duration-200"
                    >
                      {getLinkIcon(link.type)}
                    </ExternalLink>
                  ))}
                  {links.length > 5 && (
                    <span className="text-slate-600 dark:text-slate-400">
                      +{links.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end justify-end">
            <div className="flex flex-row gap-6 max-lg:flex-col  max-lg:gap-3">
              <div className="flex flex-row gap-10 max-lg:gap-4 flex-wrap max-lg:flex-col items-center max-lg:justify-center">
                <Button
                  onClick={() => {
                    if (!isConnected) {
                      openConnectModal?.();
                      return;
                    }
                    setIsEndorsementOpen(true);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-all duration-200"
                >
                  Endorse
                </Button>
                <Button
                  onClick={() => openShareDialog({
                    shareText: `Check out ${project?.details?.data?.title} on Karma GAP`,
                    modalShareText: `Share ${project?.details?.data?.title}`,
                    shareButtonText: "Share Project"
                  })}
                  className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200"
                >
                  Share
                </Button>
              </div>
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
    </>
  );
};
