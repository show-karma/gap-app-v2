"use client";
import Image from "next/image";
import React from "react";
import { ProgressDialog } from "@/components/Dialogs/ProgressDialog";
import { Globe } from "@/components/Icons";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { ProjectNavigator } from "@/components/Pages/Project/ProjectNavigator";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useProject } from "@/hooks/useProject";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore, useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { isCustomLink } from "@/utilities/customLink";
import { ensureProtocol } from "@/utilities/ensureProtocol";
import { cn } from "@/utilities/tailwind";
import { ShareDialog } from "../GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog";
import { IntroDialog } from "./IntroDialog";

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

  const customLinks = React.useMemo(() => {
    return project?.details?.data.links?.filter(isCustomLink) || [];
  }, [project?.details?.data.links]);

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
        <div
          className={cn(
            layoutTheme.padding,
            "flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between"
          )}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ProfilePicture
              imageURL={project?.details?.data?.imageURL}
              name={project?.uid || ""}
              size="56"
              className="hidden sm:block h-14 w-14 min-w-14 min-h-14 shrink-0 border-2 border-white shadow-lg"
              alt={project?.details?.data?.title || "Project"}
            />
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <div className="flex flex-row gap-3 items-center">
                <ProfilePicture
                  imageURL={project?.details?.data?.imageURL}
                  name={project?.uid || ""}
                  size="48"
                  className="sm:hidden h-12 w-12 min-w-12 min-h-12 shrink-0 border-2 border-white shadow-lg"
                  alt={project?.details?.data?.title || "Project"}
                />
                <h1 className={"text-xl font-bold leading-tight line-clamp-2 sm:text-3xl"}>
                  {project?.details?.data?.title}
                </h1>
              </div>
              {(socials.length > 0 || customLinks.length > 0) && (
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

                  {customLinks.length > 0 && (
                    <div className="relative group">
                      <Globe className="h-5 w-5 text-black dark:text-white dark:fill-zinc-200 cursor-pointer" />

                      <div className="absolute left-0 top-6 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="py-2">
                          {customLinks.map((link, index) => (
                            <a
                              key={link.url || index}
                              href={ensureProtocol(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-150"
                            >
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {project?.details?.data?.tags?.length ? (
                <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
                  {project?.details?.data?.tags?.map((tag) => (
                    <span
                      key={tag.name}
                      className="rounded bg-gray-100 px-2 py-1 text-sm font-normal text-slate-700"
                    >
                      {tag.name}
                    </span>
                  ))}
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
          <div className={cn(layoutTheme.padding, "py-0")}>
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
