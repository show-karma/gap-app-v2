"use client";

import React from "react";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useProject } from "@/hooks/useProject";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store/owner";
import { useProjectStore } from "@/store/project";
import { isCustomLink } from "@/utilities/customLink";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectModals } from "./ProjectModals";
import { ProjectNavigation } from "./ProjectNavigation";

interface ProjectWrapperProps {
  projectId: string;
}

export const ProjectWrapper = ({ projectId }: ProjectWrapperProps) => {
  const { isProjectAdmin } = useProjectStore();
  const { isProjectOwner } = useProjectStore();

  const isOwner = useOwnerStore((state: any) => state.isOwner);

  const { project } = useProject(projectId);

  // Fetch grants using dedicated hook
  const { grants } = useProjectGrants(project?.uid || projectId);

  // Start hook for permissions
  useProjectPermissions();

  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner;
  const { data: contactsInfo } = useContactInfo(projectId, isAuthorized);
  const hasContactInfo = Boolean(contactsInfo?.length);

  useTeamProfiles(project);

  // Use custom hooks for socials and members
  const socials = useProjectSocials(project?.details?.links);
  useProjectMembers(project);

  const customLinks = React.useMemo(() => {
    return project?.details?.links?.filter(isCustomLink) || [];
  }, [project?.details?.links]);

  return (
    <div>
      <ProjectModals />
      <div className="relative border-b border-gray-200">
        <div className={cn(layoutTheme.padding)}>
          <ProjectHeader
            project={project}
            socials={socials}
            customLinks={customLinks}
            isProjectAdmin={isProjectAdmin}
          />
        </div>
        <div className="mt-4 max-sm:px-4">
          <div className={cn(layoutTheme.padding, "py-0")}>
            <ProjectNavigation
              projectId={projectId}
              hasContactInfo={hasContactInfo}
              grantsLength={grants.length}
              project={project}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
