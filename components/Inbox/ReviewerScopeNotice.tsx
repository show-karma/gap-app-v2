"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { dataTour, TOUR_ANCHORS } from "@/src/features/onboarding/lib/tour-anchors";

/**
 * Where a reviewer's remit ends.
 *
 * This is the one thing the inbox itself cannot teach: the boundaries of the
 * role are absences — no edit control, no approve button, no settings — and an
 * absent affordance has nothing to point at. A reviewer who believes they are
 * casting the deciding vote gets no correction from the screen.
 *
 * Stated permanently rather than in a first-run dialog, because it is the kind
 * of thing someone needs on the day they hit it, not on the day they signed up.
 */
export function ReviewerScopeNotice() {
  return (
    <div
      className="flex flex-row items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60"
      {...dataTour(TOUR_ANCHORS.reviewerInboxScope)}
    >
      <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
      <p className="m-0 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        You score applications and leave comments. Editing an application, making the final funding
        decision, and changing program settings stay with the program&apos;s admins.
      </p>
    </div>
  );
}
