"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GrantCompletionCard } from "@/components/Pages/Grants/MilestonesAndUpdates";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
/* eslint-disable @next/next/no-img-element */
import { useOwnerStore, useProjectStore } from "@/store";
// import { MilestonesList } from "./MilestonesList";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import type { GrantResponse } from "@/types/v2/grant";
import type { ProjectResponse } from "@/types/v2/project";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

const MilestonesList = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestonesList"
    ).then((mod) => mod.MilestonesList),
  {
    loading: () => <DefaultLoading />,
  }
);

export const EmptyMilestone = ({
  grant,
  project,
}: {
  grant?: GrantResponse;
  project?: ProjectResponse;
}) => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);

  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  if (!isAuthorized) {
    return (
      <div className="flex w-full items-center justify-center rounded-md border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img src="/images/comments.png" alt="" className="h-[185px] w-[438px] object-cover" />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black dark:text-zinc-100">
              {MESSAGES.PROJECT.EMPTY.GRANTS.UPDATES}
            </p>
            <p className="text-center text-lg font-normal text-black dark:text-zinc-100">
              {MESSAGES.PROJECT.EMPTY.GRANTS.CTA_UPDATES}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full items-center justify-center rounded-md border border-gray-200 px-6 py-10">
      <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
        <img src="/images/comments.png" alt="" className="h-[185px] w-[438px] object-cover" />
        <div className="flex w-full flex-col items-center justify-center gap-3">
          <p className="text-center text-lg font-semibold text-black dark:text-white">
            {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_ADDED_MILESTONE}
          </p>
          <div className="flex w-max flex-row flex-wrap gap-6 max-sm:w-full max-sm:flex-col">
            <Link
              href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                project?.details?.slug || project?.uid || "",
                grant?.uid || "",
                "create-milestone"
              )}
              className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 dark:bg-blue-800 bg-brand-blue px-4 py-2.5 text-base font-semibold text-white hover:bg-brand-blue"
            >
              <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
              Add a new Milestone
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MilestonesAndUpdates = () => {
  const { grant } = useGrantStore();
  const project = useProjectStore((state) => state.project);

  const hasMilestonesOrUpdates = grant?.milestones?.length || grant?.updates?.length;
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  return (
    <div className="space-y-5">
      {grant?.completed &&
      (grant?.completed?.data?.title ||
        grant?.completed?.data?.text ||
        grant?.completed?.data?.proofOfWork) ? (
        <GrantCompletionCard completion={grant?.completed} />
      ) : null}
      {hasMilestonesOrUpdates ? (
        <div className="flex flex-1 flex-col gap-4">
          {grant && (
            <div className="w-full flex flex-col gap-4">
              {isAuthorized ? (
                <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 rounded border border-gray-200 bg-blue-50 dark:bg-zinc-800 p-4">
                  <p className="text-base font-normal text-black max-sm:text-sm dark:text-white">
                    {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_ADDED_MILESTONE}
                  </p>
                  <div className="flex flex-row justify-start gap-4 max-sm:w-full max-sm:flex-col">
                    {isAuthorized && (
                      <Link
                        href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                          project?.details?.slug || project?.uid || "",
                          grant?.uid || "",
                          "create-milestone"
                        )}
                        className="flex h-max w-max  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-1 text-sm font-semibold text-white   max-sm:w-full"
                      >
                        <p>Add a new milestone</p>
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
              <MilestonesList grant={grant} />
            </div>
          )}
        </div>
      ) : (
        <EmptyMilestone grant={grant} project={project} />
      )}
    </div>
  );
};
