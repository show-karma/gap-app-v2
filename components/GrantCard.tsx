/* eslint-disable @next/next/no-img-element */
"use client";

import Link, { useLinkStatus } from "next/link";
import pluralize from "pluralize";
import type { GrantResponse } from "@/types/v2/grant";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { rewriteHeadingsToLevel } from "@/utilities/markdown";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { GrantPercentage } from "./Pages/Project/Grants/components/GrantPercentage";
import { TrackTags } from "./TrackTags";
import { MarkdownPreview } from "./Utilities/MarkdownPreview";
import { ProfilePicture } from "./Utilities/ProfilePicture";
import { Spinner } from "./Utilities/Spinner";

interface GrantCardProps {
  grant: GrantResponse;
  index: number;
  hideStats?: boolean;
  hideCategories?: boolean;
  actionSlot?: React.ReactNode;
  cardClassName?: string;
}

export const pickColor = (index: number) => {
  const cardColors = [
    "#5FE9D0",
    "#875BF7",
    "#F97066",
    "#FDB022",
    "#A6EF67",
    "#84ADFF",
    "#EF6820",
    "#EE46BC",
    "#EEAAFD",
    "#67E3F9",
  ];
  return cardColors[index % cardColors.length];
};

const updatesLength = (milestones: GrantResponse["milestones"], updatesCount: number) =>
  (milestones?.filter((milestone) => milestone.completed)?.length ?? 0) + updatesCount;

// Loading indicator component that uses useLinkStatus
const LoadingIndicator = () => {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-blue-50/90 to-purple-50/90 dark:from-blue-950/90 dark:to-purple-950/90 rounded-2xl backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
      </div>
    </div>
  );
};

// Card content component that uses useLinkStatus for styling
const GrantCardContent = ({
  grant,
  index,
  hideStats,
  hideCategories,
  actionSlot,
}: GrantCardProps) => {
  const { pending } = useLinkStatus();

  const selectedTrackIds = grant.details?.selectedTrackIds as string[] | undefined;
  const communityId = grant.communityUID;
  const programId = grant.details?.programId;

  // Extract the base programId if it includes a chainId suffix (format: programId_chainId)
  const _baseProgramId = programId?.includes("_") ? programId.split("_")[0] : programId;

  // Check if we have valid track IDs to display
  const hasTrackIds = selectedTrackIds && selectedTrackIds.length > 0;

  const demoteAllHeadings = rewriteHeadingsToLevel(4);

  return (
    <div className="flex flex-col items-start justify-between w-full relative" id="grant-card">
      {actionSlot ? <div className="absolute bottom-1 left-1 z-20">{actionSlot}</div> : null}
      <LoadingIndicator />
      <div
        className={cn(
          `w-full flex flex-col gap-0.5 transition-all duration-300 ${
            pending ? "scale-95 blur-sm opacity-50" : ""
          }`,
          actionSlot ? "px-1" : ""
        )}
      >
        <div
          className={cn("h-[4px] w-full rounded-full mb-1.5")}
          style={{
            background: pickColor(index),
          }}
        />

        <div
          className={cn(
            "flex w-full flex-col px-3 items-start justify-start text-start",
            actionSlot ? "px-0" : ""
          )}
        >
          <div className="flex flex-row items-center justify-between mb-0.5">
            <div className={cn("flex flex-row items-center gap-2", actionSlot ? "mt-1" : "")}>
              <div className="flex justify-center">
                <ProfilePicture
                  imageURL={grant.project?.details?.logoUrl}
                  name={grant.project?.uid || grant.refUID || ""}
                  size="32"
                  className="h-8 w-8 min-w-8 min-h-8 border border-white shadow-sm"
                  alt={grant.project?.details?.title || "Project"}
                />
              </div>
              <p
                id="grant-project-title"
                className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm flex-1"
              >
                {grant.project?.details?.title || grant.uid}
              </p>
            </div>
          </div>
          {actionSlot ? null : (
            <p className="mb-1 text-sm font-medium text-gray-400 dark:text-zinc-400 max-2xl:text-[13px]">
              Created on {formatDate(grant.createdAt)}
            </p>
          )}
          {communityId && hasTrackIds && (
            <div className="mb-1">
              <TrackTags communityId={communityId} trackIds={selectedTrackIds} />
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1 h-[48px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-3">
              <MarkdownPreview
                source={grant.project?.details?.description?.slice(0, 200)}
                allowElement={(element) => {
                  // Prevent rendering links to avoid nested <a> tags
                  return element.tagName !== "a";
                }}
                rehypeRewrite={(node) => demoteAllHeadings(node)}
              />
            </div>
          </div>
        </div>
      </div>

      {(() => {
        const showStats = !hideStats;
        const hasCategories = (grant.categories?.length || 0) > 0;
        const showCategories = !hideCategories && hasCategories;
        if (!showStats && !showCategories) return null;
        return (
          <div className="w-full flex flex-col gap-1 my-1 mt-4">
            {showStats && (
              <div className="flex w-full flex-row flex-wrap justify-start gap-1">
                <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50   dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                  <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                    {formatCurrency(grant.milestones?.length || 0)}{" "}
                    {pluralize("Milestone", grant.milestones?.length || 0)}
                  </p>
                </div>

                {grant && (
                  <GrantPercentage
                    grant={grant}
                    className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]"
                  />
                )}

                <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                  <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                    {formatCurrency(updatesLength(grant.milestones, grant.updates?.length ?? 0))}{" "}
                    {pluralize(
                      "Update",
                      updatesLength(grant.milestones, grant.updates?.length ?? 0)
                    )}
                  </p>
                </div>
              </div>
            )}

            {showCategories && (
              <div className="gap-1 flex items-center justify-start flex-row flex-wrap overflow-y-auto">
                {grant.categories?.map((category) => (
                  <div
                    key={category}
                    className="flex h-max max-h-[64px] w-max items-center justify-start  rounded-2xl bg-blue-100 dark:bg-blue-900 dark:mix-blend-normal px-3 py-1 mix-blend-multiply  max-2xl:px-2"
                  >
                    <div className="h-max max-h-[64px] w-max max-w-[260px] truncate break-words text-start text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                      {category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export const GrantCard = ({
  grant,
  index,
  hideStats = false,
  hideCategories = false,
  actionSlot,
  cardClassName,
}: GrantCardProps) => {
  const href = PAGES.PROJECT.OVERVIEW(grant.project?.details?.slug || grant.refUID || "");

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "flex h-full w-full max-w-[620px] max-sm:w-[320px] relative rounded-2xl border border-zinc-200 p-2 transition-all duration-300 ease-in-out hover:opacity-80",
        cardClassName
      )}
    >
      <GrantCardContent
        grant={grant}
        index={index}
        hideStats={hideStats}
        hideCategories={hideCategories}
        actionSlot={actionSlot}
      />
    </Link>
  );
};
