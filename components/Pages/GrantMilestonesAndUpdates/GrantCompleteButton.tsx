"use client";

import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQueryState } from "nuqs";
import type { FC } from "react";

interface GrantCompleteProps {
  project: IProjectResponse;
  grant: IGrantResponse;
  text?: string;
}

export const GrantCompleteButton: FC<GrantCompleteProps> = ({
  grant,
  project,
  text = "Mark as Complete",
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const [, changeTab] = useQueryState("tab");
  if (grant.completed) {
    return (
      <div className="flex flex-row items-center  justify-center gap-2 rounded-md border border-emerald-600 bg-green-100 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-green-100">
        Grant marked as complete
        <div className="h-5 w-5">
          <CheckCircleIcon className="h-5 w-5" />
        </div>
      </div>
    );
  }
  if (!isAuthorized || !project) return null;
  return (
    <button
      onClick={() => {
        changeTab("complete-grant");
      }}
      className="hover:opacity-75 flex flex-row items-center justify-center gap-2 rounded-md  bg-[#17B26A] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#17B26A]"
    >
      {text}
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5" />
      </div>
    </button>
  );
};
