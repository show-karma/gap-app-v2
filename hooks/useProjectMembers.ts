import { useMemo } from "react";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
}

export const useProjectMembers = (project?: IProjectResponse): Member[] => {
  return useMemo(() => {
    if (!project) return [];

    const members: Member[] = [];
    
    if (project.members) {
      project.members.forEach((member: any) => {
        members.push({
          uid: member.uid,
          recipient: member.recipient,
          details: {
            name: member?.details?.name,
          },
        });
      });
    }
    
    const alreadyHasOwner = project.members?.find(
      (member: any) => member.recipient === project.recipient
    );
    
    if (!alreadyHasOwner && project.recipient) {
      members.push({
        uid: project.recipient,
        recipient: project.recipient,
      });
    }

    return members;
  }, [project]);
};