"use client";

import { useOwnerStore, useProjectStore } from "@/store";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { FC, useEffect, useState } from "react";
import { UpdateBlock } from "./UpdateBlock";
import { MESSAGES } from "@/utilities/messages";
import { Button } from "@/components/Utilities/Button";
import { useProgressModalStore } from "@/store/modals/progress";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useQuery } from "@tanstack/react-query";

type UpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectMilestoneResponse
  | IProjectImpact;

export const UpdatesPage: FC = () => {
  const { project } = useProjectStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  const [allUpdates, setAllUpdates] = useState<any[]>([]);
  const { setIsProgressModalOpen, setProgressModalScreen } =
    useProgressModalStore();

  // Fetch project milestones directly from API
  const { data: projectMilestones } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones", project?.uid],
    queryFn: () => getProjectObjectives(project?.uid || ""),
    enabled: !!project?.uid,
  });

  useEffect(() => {
    // Log project structure for debugging

    const updates: IProjectUpdate[] = project?.updates || [];
    const grantUpdates: IGrantUpdate[] = [];
    const grantMilestones: IMilestoneResponse[] = [];
    const impacts: IProjectImpact[] = project?.impacts || [];

    project?.grants.forEach((grant) => {
      grantUpdates.push(...grant.updates);
      grantMilestones.push(...grant.milestones);
    });

    console.log("Data counts:", {
      updates: updates.length,
      grantUpdates: grantUpdates.length,
      grantMilestones: grantMilestones.length,
      projectMilestones: projectMilestones?.length || 0,
      projectImpacts: impacts.length,
    });

    const sortedUpdates = [
      ...updates,
      ...grantUpdates,
      ...grantMilestones,
      ...(projectMilestones || []), // Use API-fetched milestones instead
      ...impacts,
    ].sort((a, b) => {
      // For completed milestones, use completion date for sorting
      const getDateA = () => {
        if ("type" in a) {
          if (
            a.type === "ProjectMilestone" &&
            "completed" in a &&
            a.completed
          ) {
            return new Date(a.completed.createdAt).getTime();
          }
          if (a.type === "Milestone" && "completed" in a && a.completed) {
            return new Date(a.completed.createdAt).getTime();
          }
        }
        return new Date(a.createdAt).getTime();
      };

      const getDateB = () => {
        if ("type" in b) {
          if (
            b.type === "ProjectMilestone" &&
            "completed" in b &&
            b.completed
          ) {
            return new Date(b.completed.createdAt).getTime();
          }
          if (b.type === "Milestone" && "completed" in b && b.completed) {
            return new Date(b.completed.createdAt).getTime();
          }
        }
        return new Date(b.createdAt).getTime();
      };

      return getDateB() - getDateA();
    });

    setAllUpdates(sortedUpdates);
  }, [
    project?.grants,
    project?.updates,
    project?.impacts,
    projectMilestones, // Use the query result instead of project.milestones
  ]);

  return (
    <div className="flex flex-col items-center justify-start">
      <div
        id="updates-tab"
        className="flex flex-col gap-6 my-10 max-lg:my-5 max-w-6xl w-full"
      >
        <div className="flex flex-row gap-4 justify-between">
          <p className="font-bold text-black dark:text-zinc-200 text-xl">
            Updates {allUpdates.length ? `(${allUpdates.length})` : ""}
          </p>
        </div>
        {allUpdates.length ? (
          <div className="flex flex-col gap-6">
            {allUpdates.map((update, index) => (
              <UpdateBlock
                key={update.id || update.uid}
                update={update}
                index={index}
              />
            ))}
          </div>
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
