"use client";

import type { FC } from "react";
import { ActivityList } from "@/components/Shared/ActivityList";
import { Button } from "@/components/Utilities/Button";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { MESSAGES } from "@/utilities/messages";

export const UpdatesPage: FC = () => {
  const { project } = useProjectStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  const { setIsProgressModalOpen, setProgressModalScreen } = useProgressModalStore();

  // Fetch all updates using the dedicated hook
  const { milestones: allUpdates } = useProjectUpdates(project?.uid || "");

  // Fetch impacts using the dedicated hook
  const { impacts } = useProjectImpacts(project?.uid || "");

  // Combine updates and impacts, then sort by date
  const combinedUpdates = [
    ...allUpdates,
    ...impacts.map((impact) => ({
      uid: impact.uid,
      type: "impact" as const,
      title: impact.data?.work || "Impact",
      description: impact.data?.impact,
      createdAt: impact.createdAt || new Date().toISOString(),
      completed: false,
      chainID: 0,
      refUID: impact.refUID,
      source: { type: "impact" },
    })),
  ].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex flex-col items-center justify-start">
      <div id="updates-tab" className="flex flex-col gap-6 my-10 max-lg:my-5 max-w-full w-full">
        <div className="flex flex-row gap-4 justify-between">
          <p className="font-bold text-black dark:text-zinc-200 text-xl">
            Updates {combinedUpdates.length ? `(${combinedUpdates.length})` : ""}
          </p>
        </div>
        {combinedUpdates.length ? (
          <ActivityList milestones={combinedUpdates} isAuthorized={isAuthorized} />
        ) : (
          <div className="flex flex-col gap-6">
            {isAuthorized ? (
              <div className="flex flex-1 flex-col gap-6">
                <div
                  className="flex h-60 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
                  style={{
                    border: "dashed 2px #155EEF",
                  }}
                >
                  <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
                    Go ahead and create your first project activity
                  </p>
                  <Button
                    type="button"
                    className="w-max bg-brand-blue text-white px-4 py-2 rounded-lg"
                    onClick={() => {
                      setProgressModalScreen("project_update");
                      setIsProgressModalOpen(true);
                    }}
                  >
                    Create new activity
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
                <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
                  <img
                    src="/images/comments.png"
                    alt=""
                    className="h-[185px] w-[438px] object-cover"
                  />
                  <div className="flex w-full flex-col items-center justify-center gap-3">
                    <p className="text-center text-lg font-semibold text-black dark:text-zinc-100 ">
                      Welcome to the Project Activities section!
                    </p>
                    <p className="text-center text-base font-normal text-black dark:text-zinc-100 ">
                      {MESSAGES.PROJECT.EMPTY.UPDATES.NOT_CREATED}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
