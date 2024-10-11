"use client";

import { useProjectStore } from "@/store";
import { MemberCard } from "./MemberCard";

export const Team = () => {
  const { project } = useProjectStore((state) => state);
  //   check if it have some duplicated

  const members = Array.from(
    new Set([
      project?.recipient,
      ...(project?.members?.map((member) => member.recipient) || []),
    ])
  );
  return (
    <div className="pt-5 pb-20 flex flex-col items-start gap-4">
      <h3 className="font-semibold text-lg text-black dark:text-white">
        Built by
      </h3>
      <div className="flex flex-col gap-4 max-w-3xl w-full">
        {members.length
          ? members?.map((member) => (
              <MemberCard key={member} member={member as string} />
            ))
          : null}
      </div>
    </div>
  );
};
