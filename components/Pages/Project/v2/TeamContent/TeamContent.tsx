"use client";

import { useQuery } from "@tanstack/react-query";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { InviteMemberDialog } from "@/components/Dialogs/Member/InviteMember";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useOwnerStore, useProjectStore } from "@/store";
import { getProjectMemberRoles, type Member } from "@/utilities/getProjectMemberRoles";
import { cn } from "@/utilities/tailwind";
import { TeamMemberCard } from "./TeamMemberCard";

interface TeamContentProps {
  className?: string;
}

/**
 * TeamContent displays the list of team members for a project.
 *
 * Features:
 * - Displays all team members sorted by role (Owner > Admin > Member)
 * - Provides invite member functionality for authorized users
 * - Shows contributor profile edit dialog
 */
export function TeamContent({ className }: TeamContentProps) {
  const project = useProjectStore((state) => state.project);

  // Deduplicate members - owner is always first
  const members = project
    ? Array.from(
        new Set([project?.owner, ...(project?.members?.map((member) => member.address) || [])])
      )
    : [];

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  const { project: projectInstance } = useProjectInstance(
    project?.details?.slug || project?.uid || ""
  );

  const { data: memberRoles } = useQuery<Record<string, Member["role"]>>({
    queryKey: ["memberRoles", project?.uid],
    queryFn: () =>
      project && projectInstance ? getProjectMemberRoles(project, projectInstance) : {},
    enabled: !!project && !!projectInstance,
    staleTime: 1000 * 60 * 5,
  });

  // Sort members by role: Owner > Admin > Member
  const sortedMembers = [...members].sort((a, b) => {
    const roleA = memberRoles?.[a.toLowerCase()] || "Member";
    const roleB = memberRoles?.[b.toLowerCase()] || "Member";

    const roleOrder: Record<string, number> = {
      Owner: 0,
      Admin: 1,
      Member: 2,
    };

    return roleOrder[roleA] - roleOrder[roleB];
  });

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="team-content">
      <ContributorProfileDialog />

      {/* Header with invite button */}
      <div className="flex flex-row justify-between items-center w-full">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Team Members ({members.length})
        </h2>
        {isAuthorized && <InviteMemberDialog />}
      </div>

      {/* Team members list */}
      <div className="flex flex-col gap-3" data-testid="team-members-list">
        {sortedMembers.length > 0 ? (
          sortedMembers.map((member) => <TeamMemberCard key={member} member={member as string} />)
        ) : (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            No team members found
          </div>
        )}
      </div>
    </div>
  );
}
