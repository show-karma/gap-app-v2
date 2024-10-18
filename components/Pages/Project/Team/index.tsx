"use client";

import { useProjectStore } from "@/store";
import { MemberCard } from "./MemberCard";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { InviteMemberDialog } from "@/components/Dialogs/Member/InviteMember";

export const Team = () => {
  const { project } = useProjectStore((state) => state);
  //   check if it have some duplicated

  const members = project
    ? Array.from(
        new Set([
          project?.recipient,
          ...(project?.members?.map((member) => member.recipient) || []),
        ])
      )
    : [];

  return (
    <div className="pt-5 pb-20 flex flex-col items-start gap-4">
      <ContributorProfileDialog />
      <div className="flex flex-row gap-2 w-full max-w-3xl justify-between">
        <h3 className="font-semibold text-lg text-black dark:text-white">
          Built by
        </h3>
        <InviteMemberDialog />
      </div>
      <div className="flex flex-col gap-4 max-w-3xl w-full">
        {members?.length
          ? members?.map((member) => (
              <MemberCard key={member} member={member as string} />
            ))
          : null}
      </div>
    </div>
  );
};
