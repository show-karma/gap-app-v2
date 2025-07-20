"use client";
import React from "react";
import { ExternalLink } from "@/components/ui/external-link";
import { ProfilePicture } from "@/components/ui/profile-picture";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { useEndorsementStore } from "@/features/modals/lib/stores/endorsement";
import Image from "next/image";

import { useContactInfo } from "@/hooks/useContactInfo";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import useProjectMembers from "@/features/projects/hooks/use-project-members";
import IntroDialog from "../shared/intro-dialog";
import { ShareDialog } from "@/features/grants/components/milestones/ShareDialog";
import { useIntroModalStore } from "@/features/modals/lib/stores/intro";
import useProjectSocials from "../../hooks/use-project-socials";
import useProjectPermissions from "../../hooks/use-project-permissions";
import useProject from "../../hooks/use-project";
import { useShareDialogStore } from "@/features/modals/lib/stores/shareDialog";
import { useProgressModalStore } from "@/features/modals/lib/stores/progress";
import { EndorsementDialog } from "../impact/EndorsementDialog";
import { ProgressDialog } from "../dialogs/ProgressDialog";
import { ProjectNavigator } from "./navigator";

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
