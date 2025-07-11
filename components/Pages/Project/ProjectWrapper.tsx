"use client";
import React from "react";
import { ProgressDialog } from "@/components/Dialogs/ProgressDialog";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { ProjectNavigator } from "@/components/Pages/Project/ProjectNavigator";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useOwnerStore, useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import Image from "next/image";

import { IntroDialog } from "./IntroDialog";

import { useContactInfo } from "@/hooks/useContactInfo";
import { ShareDialog } from "../GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { useProject } from "@/hooks/useProject";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import { useProjectMembers } from "@/hooks/useProjectMembers";

interface ProjectWrapperProps {
  projectId: string;
}

export const ProjectWrapper = ({ projectId }: ProjectWrapperProps) => {
  const { isProjectAdmin } = useProjectStore();
  const { isProjectOwner } = useProjectStore();

  const isOwner = useOwnerStore((state: any) => state.isOwner);

  const { project } = useProject(projectId);

  // Start hook for permissions
  useProjectPermissions();

  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner;
  const { data: contactsInfo } = useContactInfo(projectId, isAuthorized);
  const hasContactInfo = Boolean(contactsInfo?.length);

  useTeamProfiles(project);

  // Use custom hooks for socials and members
  const socials = useProjectSocials(project?.details?.data.links);
  useProjectMembers(project);

  const { isIntroModalOpen } = useIntroModalStore();
  const { isEndorsementOpen } = useEndorsementStore();
  const { isProgressModalOpen } = useProgressModalStore();
  const { isOpen: isShareDialogOpen } = useShareDialogStore();

  return (
    <div>
      {isIntroModalOpen ? <IntroDialog /> : null}
      {isEndorsementOpen ? <EndorsementDialog /> : null}
      {isProgressModalOpen ? <ProgressDialog /> : null}
      {isShareDialogOpen ? <ShareDialog /> : null}
      <div className="relative border-b border-gray-200 ">
        <div className="px-4 sm:px-6 lg:px-12 lg:flex py-5 lg:items-start lg:justify-between flex flex-row max-lg:flex-col max-lg:justify-center max-lg:items-center gap-4">
          <div className="flex flex-row gap-4 items-start">
            <div className="flex justify-center">
              <ProfilePicture
                imageURL={project?.details?.data?.imageURL}
                name={project?.uid || ""}
                size="56"
                className="h-14 w-14 min-w-14 min-h-14 border-2 border-white shadow-lg max-lg:h-12 max-lg:w-12 max-lg:min-h-12 max-lg:min-w-12"
                alt={project?.details?.data?.title || "Project"}
              />
            </div>
            <div className="flex flex-col gap-4">
              <h1
                className={
                  "text-[32px] font-bold leading-tight text-black dark:text-zinc-100 line-clamp-2"
                }
              >
                {project?.details?.data?.title}
              </h1>
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
              </div>
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
          </div>
          <div className="flex flex-col gap-3 items-end justify-end">
            <div className="flex flex-row gap-6 max-lg:flex-col  max-lg:gap-3">
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
    </div>
  );
};
