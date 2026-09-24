"use client";

import { CpuChipIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import type { FC } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button as UiButton } from "@/components/ui/button";
import type { SimocracyCouncilSim } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { type ReviewerOption, truncateMiddle } from "./sim-link.shared";

interface SimLinkChipsProps {
  canManage: boolean;
  unlinkedSims: SimocracyCouncilSim[];
  simlessReviewers: ReviewerOption[];
  onPickSim: (simUri: string) => void;
  onPickReviewer: (publicAddress: string) => void;
}

/** Council sims with no link and reviewers with no sim, each one click away from the form. */
export const SimLinkChips: FC<SimLinkChipsProps> = ({
  canManage,
  unlinkedSims,
  simlessReviewers,
  onPickSim,
  onPickReviewer,
}) => (
  <>
    {(unlinkedSims.length > 0 || simlessReviewers.length > 0) && (
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3.5 dark:border-gray-700 dark:bg-zinc-900/40">
        {unlinkedSims.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {unlinkedSims.length} council {pluralize("sim", unlinkedSims.length)}{" "}
              {unlinkedSims.length === 1 ? "isn't" : "aren't"} linked, so their evaluations are
              dropped from every application.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unlinkedSims.map((sim) => (
                <div
                  key={sim.simUri}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white py-1 pl-1.5 pr-1 dark:border-gray-700 dark:bg-zinc-800"
                >
                  {sim.avatar ? (
                    <ProfilePicture
                      imageURL={sim.avatar}
                      name={sim.simName ?? sim.simUri}
                      size="18"
                      className="h-[18px] w-[18px] rounded [image-rendering:pixelated]"
                      alt=""
                    />
                  ) : (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-gray-500">
                      <CpuChipIcon className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {sim.simName ?? truncateMiddle(sim.simUri, 14, 8)}
                  </span>
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onPickSim(sim.simUri)}
                    className="h-6 px-2 text-xs text-blue-600 shadow-none dark:text-blue-400"
                  >
                    Link
                  </UiButton>
                </div>
              ))}
            </div>
          </>
        )}
        {canManage && simlessReviewers.length > 0 && (
          <>
            <p
              className={cn(
                "text-xs font-medium text-gray-700 dark:text-gray-300",
                unlinkedSims.length > 0 && "mt-3"
              )}
            >
              {simlessReviewers.length} program {pluralize("reviewer", simlessReviewers.length)}{" "}
              {simlessReviewers.length === 1 ? "has" : "have"} no sim; they can still review by
              hand, but won't appear in the council.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {simlessReviewers.map((reviewer) => (
                <div
                  key={reviewer.publicAddress}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white py-1 pl-2 pr-1 dark:border-gray-700 dark:bg-zinc-800"
                >
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {reviewer.name || reviewer.email}
                  </span>
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onPickReviewer(reviewer.publicAddress)}
                    className="h-6 px-2 text-xs shadow-none"
                  >
                    Assign sim
                  </UiButton>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )}
  </>
);
