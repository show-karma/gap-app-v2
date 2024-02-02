/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ProjectPageLayout } from ".";
import { shortAddress } from "@/utilities";
import { blo } from "blo";
import { useProjectStore } from "@/store";
import { Hex } from "viem";

function TeamPage() {
  const project = useProjectStore((state) => state.project);
  return (
    <div className="pt-5 pb-20">
      <div className="font-semibold text-black dark:text-white">Built By</div>
      {project?.members.map((member) => (
        <div key={member.uid} className="mt-3 group block flex-shrink-0">
          <div className="flex items-center">
            <div>
              <img
                src={blo((member.details?.name as Hex) || member.recipient)}
                alt={member.details?.name || member.recipient}
                className="inline-block h-9 w-9 rounded-md"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-400 ">
                {member.details?.name || member.recipient}
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-300 ">
                {shortAddress(member.details?.name || member.recipient)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

TeamPage.getLayout = ProjectPageLayout;

export default TeamPage;
