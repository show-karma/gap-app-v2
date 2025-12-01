import React from "react";
import type { ProjectV2Response } from "@/types/project";

interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
}

export const useProjectMembers = (project?: ProjectV2Response): Member[] => {
  return React.useMemo(() => {
    if (!project) return [];

    const members: Member[] = [];

    if (project.members) {
      project.members.forEach((member: any) => {
        members.push({
          uid: member.address || member.uid,
          recipient: member.address,
          details: {
            name: member?.details?.name,
          },
        });
      });
    }

    const alreadyHasOwner = project.members?.find(
      (member: any) => member.address === project.owner
    );

    if (!alreadyHasOwner) {
      members.push({
        uid: project.owner || "",
        recipient: project.owner || "",
      });
    }

    return members;
  }, [project]);
};
