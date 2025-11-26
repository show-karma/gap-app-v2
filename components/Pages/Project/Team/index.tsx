"use client";

import { useQuery } from "@tanstack/react-query";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { InviteMemberDialog } from "@/components/Dialogs/Member/InviteMember";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useOwnerStore, useProjectStore } from "@/store";
import { getProjectMemberRoles, type Member } from "@/utilities/getProjectMemberRoles";
import { MemberCard } from "./MemberCard";

export const Team = () => {
  const project = useProjectStore((state) => state.project);

  //   check if it have some duplicated
  const members = project
    ? Array.from(
        new Set([
          project?.recipient,
          ...(project?.members?.map((member) => member.recipient) || []),
        ])
      )
    : [];

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  const { project: projectInstance } = useProjectInstance(
    project?.details?.data.slug || project?.uid || ""
  );

  const {
    data: memberRoles,
    isLoading: isLoadingRoles,
    isFetching: isFetchingRoles,
  } = useQuery<Record<string, Member["role"]>>({
    queryKey: ["memberRoles", project?.uid],
    queryFn: () =>
      project && projectInstance ? getProjectMemberRoles(project, projectInstance) : {},
    enabled: !!project && !!projectInstance,
    staleTime: 1000 * 60 * 5,
  });

  const sortedMembers = members.sort((a, b) => {
    const roleA = memberRoles?.[a] || "Member";
    const roleB = memberRoles?.[b] || "Member";

    const roleOrder = {
      Owner: 0,
      Admin: 1,
      Member: 2,
    };

    return roleOrder[roleA] - roleOrder[roleB];
  });

  return (
    <div className="pt-5 pb-20 flex flex-col items-start gap-4">
      <ContributorProfileDialog />
      <div className="flex flex-row gap-2 w-full max-w-3xl justify-end">
        {isAuthorized ? <InviteMemberDialog /> : null}
      </div>
      <div className="flex flex-col gap-4 max-w-3xl w-full">
        {sortedMembers?.length
          ? sortedMembers?.map((member) => <MemberCard key={member} member={member as string} />)
          : null}
      </div>
    </div>
  );
};
