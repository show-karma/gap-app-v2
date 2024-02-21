/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { MESSAGES, PAGES, ReadMore, formatDate } from "@/utilities";
import { Grant } from "@show-karma/karma-gap-sdk";
import { MilestonesList } from "./MilestonesList";
import { useRouter } from "next/router";

export const EmptyMilestone = ({ grant }: { grant?: Grant }) => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const router = useRouter();
  const project = useProjectStore((state) => state.project);

  if (!isProjectOwner && !isContractOwner) {
    return (
      <div className="flex w-full items-center justify-center rounded-md border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
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
        <img
          src="/images/comments.png"
          alt=""
          className="h-[185px] w-[438px] object-cover"
        />
        <div className="flex w-full flex-col items-center justify-center gap-3">
          <p className="text-center text-lg font-semibold text-black dark:text-white">
            {MESSAGES.PROJECT.EMPTY.GRANTS.NOT_ADDED_MILESTONE}
          </p>
          <div className="flex w-max flex-row flex-wrap gap-6 max-sm:w-full max-sm:flex-col">
            <Button
              className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 dark:bg-blue-800 bg-brand-blue px-4 py-2.5 text-base font-semibold text-white hover:bg-brand-blue"
              onClick={() => {
                if (project && grant) {
                  router.push(
                    PAGES.PROJECT.TABS.SELECTED_TAB(
                      project.details?.slug || project.uid,
                      grant.uid,
                      "create-milestone"
                    )
                  );
                }
              }}
            >
              <img
                src="/icons/plus.svg"
                alt="Add"
                className="relative h-5 w-5"
              />
              Add a new Milestone
            </Button>
            <Button
              className="items-center justify-center gap-2 rounded border dark:bg-zinc-800 dark:text-white border-black bg-white px-4 py-2.5 text-base font-semibold text-zinc-900 hover:bg-white"
              onClick={() => {
                if (project && grant) {
                  router.push(
                    PAGES.PROJECT.TABS.SELECTED_TAB(
                      project.details?.slug || project?.uid || "",
                      grant.uid,
                      "grant-update"
                    )
                  );
                }
              }}
            >
              Post an update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GrantCompletionCardProps {
  completion: Grant["completed"] | undefined;
}
const GrantCompletionCard = ({ completion }: GrantCompletionCardProps) => {
  if (!completion) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-green-100 transition-all duration-200 ease-in-out">
        <div className="flex w-full flex-col py-4">
          <div className="flex w-full flex-row justify-between  px-4 max-lg:mb-4 max-lg:flex-col">
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-bold leading-normal text-gray-700">
                {completion.title}
              </h4>
            </div>
            <div className="flex flex-row items-center justify-center gap-4 max-lg:justify-start">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-800">
                Grant completed on {formatDate(completion.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-4  pb-3 max-lg:max-w-xl max-sm:max-w-[300px]">
            <ReadMore readLessText="Read less" readMoreText="Read full">
              {completion.text}
            </ReadMore>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MilestonesAndUpdatesProps {
  grant: Grant | undefined;
}
export const MilestonesAndUpdates = ({ grant }: MilestonesAndUpdatesProps) => {
  const hasMilestonesOrUpdates =
    grant?.milestones?.length || grant?.updates?.length;
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  const project = useProjectStore((state) => state.project);
  const router = useRouter();

  return (
    <div className="space-y-5">
      {grant?.completed && (grant?.completed.title || grant?.completed.text) ? (
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
                    {isAuthorized ? (
                      <div className="flex items-center">
                        <Button
                          onClick={() => {
                            if (project) {
                              router.push(
                                PAGES.PROJECT.TABS.SELECTED_TAB(
                                  project.details?.slug || project?.uid || "",
                                  grant.uid,
                                  "grant-update"
                                )
                              );
                            }
                          }}
                          className="flex h-max w-max dark:bg-zinc-900 dark:text-white text-zinc-900 flex-row items-center justify-center gap-3 rounded border border-black bg-transparent px-3 py-1 text-sm font-semibold hover:bg-transparent hover:opacity-75 max-sm:w-full"
                        >
                          <p>Post a grant update</p>
                        </Button>
                      </div>
                    ) : null}
                    {isAuthorized && (
                      <Button
                        onClick={() => {
                          if (project) {
                            router.push(
                              PAGES.PROJECT.TABS.SELECTED_TAB(
                                project.details?.slug || project?.uid || "",
                                grant.uid,
                                "create-milestone"
                              )
                            );
                          }
                        }}
                        className="flex h-max w-max  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-1 text-sm font-semibold text-white   max-sm:w-full"
                      >
                        <p>Add a new milestone</p>
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
              <MilestonesList grant={grant} />
            </div>
          )}
        </div>
      ) : (
        <EmptyMilestone grant={grant} />
      )}
    </div>
  );
};
