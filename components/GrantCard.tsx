/* eslint-disable @next/next/no-img-element */
"use client";

import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import pluralize from "pluralize";
import { GrantPercentage } from "./Pages/Project/Grants/components/GrantPercentage";
import { MarkdownPreview } from "./Utilities/MarkdownPreview";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { TrackTags } from "./TrackTags";
import { ProfilePicture } from "./Utilities/ProfilePicture";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Spinner } from "./Utilities/Spinner";
import { rewriteHeadingsToLevel } from "@/utilities/markdown";

interface GrantCardProps {
  grant: IGrantResponse;
  index: number;
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

const updatesLength = (
  milestones: IGrantResponse["milestones"],
  updatesLength: number
) =>
  milestones.filter((milestone) => milestone.completed).length + updatesLength;

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
const GrantCardContent = ({ grant, index }: GrantCardProps) => {
  const { pending } = useLinkStatus();

  const selectedTrackIds = grant.details?.data?.selectedTrackIds as
    | string[]
    | undefined;
  const communityId = grant.data?.communityUID;
  const programId = grant.details?.data?.programId;

  // Extract the base programId if it includes a chainId suffix (format: programId_chainId)
  const baseProgramId = programId?.includes("_")
    ? programId.split("_")[0]
    : programId;

  // Check if we have valid track IDs to display
  const hasTrackIds = selectedTrackIds && selectedTrackIds.length > 0;

  const demoteAllHeadings = rewriteHeadingsToLevel(4);

  return (
    <div className="flex flex-col items-start justify-between w-full h-full" id="grant-card">
      <LoadingIndicator />
      <div
        className={`w-full flex flex-col gap-1 transition-all duration-300 ${pending ? "scale-95 blur-sm opacity-50" : ""
          }`}
      >
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />

        <div className="flex w-full flex-col px-3 items-start justify-start text-start">
          <div className="flex flex-row items-center justify-between mb-1">
            <div className="flex flex-row items-center gap-2">
              <div className="flex justify-center">
                <ProfilePicture
                  imageURL={grant.project?.details?.data?.imageURL}
                  name={grant.project?.uid || grant.refUID || ""}
                  size="32"
                  className="h-8 w-8 min-w-8 min-h-8 border border-white shadow-sm"
                  alt={grant.project?.details?.data?.title || "Project"}
                />
              </div>
              <p
                id="grant-project-title"
                className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm flex-1"
              >
                {grant.project?.details?.data?.title || grant.uid}
              </p>
            </div>
          </div>
          <p className="mb-2 text-sm font-medium text-gray-400 dark:text-zinc-400 max-2xl:text-[13px]">
            Created on {formatDate(grant.createdAt)}
          </p>
          {communityId && hasTrackIds && (
            <div className="mb-2">
              <TrackTags
                communityId={communityId}
                trackIds={selectedTrackIds}
              />
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-3">
              <MarkdownPreview
                source={grant.project?.details?.data?.description?.slice(
                  0,
                  100
                )}
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

      <div className="w-full flex flex-col gap-2 my-2">
        <div className="flex w-full flex-row flex-wrap justify-start gap-1">
          <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50   dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
            <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
              <>
                {formatCurrency(grant.milestones?.length)}{" "}
                {pluralize("Milestone", grant.milestones?.length)}
              </>
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
              {formatCurrency(
                updatesLength(grant.milestones, grant.updates.length)
              )}{" "}
              {pluralize(
                "Update",
                updatesLength(grant.milestones, grant.updates.length)
              )}
            </p>
          </div>
        </div>

        <div className="gap-1 flex items-center justify-start flex-row flex-wrap overflow-y-auto">
          {grant.categories?.map((category, index) => (
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
      </div>
    </div>
  );
};

export const GrantCard = ({ grant, index }: GrantCardProps) => {
  const href = PAGES.PROJECT.OVERVIEW(
    grant.project?.details?.data?.slug || grant.refUID || ""
  );

  return (
    <Link
      href={href}
      prefetch={false}
      className="flex h-full w-full max-w-[620px] max-sm:w-[320px] relative rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80"
    >
      <GrantCardContent grant={grant} index={index} />
    </Link>
  );
};
