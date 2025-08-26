"use client";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { ReadMore } from "@/utilities/ReadMore";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTracksForProgram } from "@/hooks/useTracks";
import { Track } from "@/services/tracks";
import { ProjectGrantsMilestonesListLoading } from "../../Project/Loading/Grants/MilestonesAndUpdate";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import Image from "next/image";

const EmptyMilestone = ({
  grant,
  project,
}: {
  grant?: IGrantResponse;
  project?: IProjectResponse;
}) => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  if (!isAuthorized) {
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
            <Link
              href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                project?.details?.data.slug || project?.uid || "",
                grant?.uid || "",
                "create-milestone"
              )}
              className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 dark:bg-blue-800 bg-brand-blue px-4 py-2.5 text-base font-semibold text-white hover:bg-brand-blue"
            >
              <img
                src="/icons/plus.svg"
                alt="Add"
                className="relative h-5 w-5"
              />
              Add a new Milestone
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GrantCompletionCardProps {
  completion: IGrantResponse["completed"] | undefined;
  grant?: IGrantResponse;
}

export const GrantCompletionCard = ({ completion, grant }: GrantCompletionCardProps) => {
  // Get program ID for fetching tracks
  const programId = grant?.details?.data?.programId
    ? `${grant.details.data.programId}_${grant.chainID}`
    : undefined;

  const { data: tracks = [] } = useTracksForProgram(programId as string);

  if (!completion) return null;

  // Access new fields from completion data
  const pitchDeckLink = completion.data?.pitchDeckLink;
  const demoVideoLink = completion.data?.demoVideoLink;
  const trackExplanations = completion.data?.trackExplanations;

  // Helper to get track name
  const getTrackName = (trackId: string): string => {
    const track = tracks.find((t: Track) => t.id === trackId);
    return track?.name || 'Track';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-blue-50 dark:bg-zinc-900 transition-all duration-200 ease-in-out">
        <div className="flex w-full flex-col py-4">
          <div className="flex w-full flex-row justify-between  px-4 max-lg:mb-4 max-lg:flex-col">
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-bold leading-normal text-gray-700">
                {completion.data.title}
              </h4>
            </div>
            <div className="flex flex-row items-center justify-center gap-4 max-lg:justify-start">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-100">
                Completed on {formatDate(completion.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-3">
            {/* Description */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-100">Completion Summary</p>
              {completion.data.text && (
                <div className="max-lg:max-w-xl max-sm:max-w-[300px]">
                  <ReadMore readLessText="Read less" readMoreText="Read full">
                    {completion.data.text}
                  </ReadMore>
                </div>
              )}
            </div>

            {/* Pitch Deck and Demo Video Cards */}
            {(pitchDeckLink || demoVideoLink) && (
              <div className="flex flex-row gap-3 flex-wrap pt-2 border-t border-gray-300">
                {pitchDeckLink && (
                  <ExternalLink
                    href={pitchDeckLink.includes("http") ? pitchDeckLink : `https://${pitchDeckLink}`}
                    className="flex-1 min-w-[140px]"
                  >
                    <div className="flex flex-row items-center gap-3 p-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:opacity-90 transition-opacity cursor-pointer">
                      <Image
                        width={24}
                        height={24}
                        src="/icons/deck.svg"
                        alt="Pitch Deck"
                        className="w-6 h-6"
                      />
                      <p className="text-sm font-bold text-black dark:text-white text-left">Read Pitch Deck</p>
                    </div>
                  </ExternalLink>
                )}
                {demoVideoLink && (
                  <ExternalLink
                    href={demoVideoLink.includes("http") ? demoVideoLink : `https://${demoVideoLink}`}
                    className="flex-1 min-w-[140px]"
                  >
                    <div className="flex flex-row items-center gap-3 p-3 rounded-lg bg-slate-200 dark:bg-gray-800 hover:opacity-90 transition-opacity cursor-pointer">
                      <Image
                        width={24}
                        height={24}
                        src="/icons/video.svg"
                        alt="Demo Video"
                        className="w-6 h-6"
                      />
                      <p className="text-sm text-black dark:text-white font-bold text-black text-left">Watch Demo Video</p>
                    </div>
                  </ExternalLink>
                )}
              </div>
            )}

            {/* Track Explanations */}
            {trackExplanations && trackExplanations.length > 0 && (
              <div className="flex flex-col gap-3">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-100">Track Integration</h5>
                <div className="flex flex-col gap-1">
                  {trackExplanations.map((trackExplanation: any) => (
                    <div key={trackExplanation.trackUID} className="bg-white/50 dark:bg-zinc-800 rounded-md p-3">
                      <h6 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                        {getTrackName(trackExplanation.trackUID)}
                      </h6>
                      {trackExplanation.explanation && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {trackExplanation.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MilestonesList = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestonesList"
    ).then((mod) => mod.MilestonesList),
  {
    loading: () => <ProjectGrantsMilestonesListLoading />,
  }
);

export default function MilestonesAndUpdates() {
  const { grant } = useGrantStore();
  const project = useProjectStore((state) => state.project);
  const hasMilestonesOrUpdates =
    grant?.milestones?.length || grant?.updates?.length;
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  return (
    <div className="w-full">
      <div className="space-y-5">
        {grant?.completed &&
          (grant?.completed.data.title ||
            grant?.completed.data.text ||
            grant?.completed?.data?.proofOfWork) ? (
          <GrantCompletionCard completion={grant?.completed} grant={grant} />
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
                            project?.details?.data.slug || project?.uid || "",
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
    </div>
  );
}
