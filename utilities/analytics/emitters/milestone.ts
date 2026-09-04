/**
 * Milestone analytics emitters.
 *
 * The emit sites live in dialogs and forms that are already well over their
 * size budget, and an inline `track()` there brings its own derivations with it
 * — a due-date delta, a fan-out over every grant a milestone was attested to.
 * Those belong to the event, not to the screen, so they live here: the screens
 * call one function and stay about their own job, and the shape of a milestone
 * event is defined in exactly one place instead of drifting between the two
 * dialogs that can create one.
 *
 * Every function here is fire-and-forget. `track()` never throws (see
 * `client.ts`), so none of these needs a caller-side guard.
 */

import { track } from "@/utilities/analytics/client";

/** The subset of a grant these emitters need — avoids importing SDK types. */
interface GrantRef {
  uid: string;
}

/** The subset of a milestone these emitters need. `endsAt` is unix seconds. */
interface MilestoneRef {
  uid: string;
  refUID?: string | null;
  endsAt?: number | null;
}

/**
 * Whole days between the due date and now — negative when the grantee finished
 * early. `null` when the milestone has no due date, which is a distinct state
 * from "on time" and must not be reported as zero.
 *
 * `endsAt` is the SDK's unix-seconds field.
 */
const daysVsDueDate = (endsAtSeconds: number | undefined | null): number | null => {
  if (!endsAtSeconds) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.now() - endsAtSeconds * 1000) / msPerDay);
};

/**
 * A roadmap milestone belongs to the project, not to any grant — hence the null
 * `grant_id`, which is what distinguishes it from a grant milestone in reports.
 */
export function emitRoadmapMilestoneCreated(projectUid: string, dueDate: unknown): void {
  track("milestone_created", {
    grant_id: null,
    project_id: projectUid,
    has_due_date: Boolean(dueDate),
  });
}

/**
 * One event per grant the milestone was attested to.
 *
 * The same form submission produces N milestones across the grants selected, and
 * a single event would understate how much milestone activity a multi-grant
 * project actually creates.
 */
export function emitGrantMilestonesCreated(
  projectUid: string,
  dueDate: unknown,
  grantsByChain: Record<string | number, readonly { grant: GrantRef }[]>
): void {
  for (const grants of Object.values(grantsByChain)) {
    for (const { grant } of grants) {
      track("milestone_created", {
        grant_id: grant.uid,
        project_id: projectUid,
        has_due_date: Boolean(dueDate),
      });
    }
  }
}

/** Completion, with the due-date delta derived rather than sent by the caller. */
export function emitMilestoneCompleted(milestone: MilestoneRef, deliverables: number): void {
  track("milestone_completed", {
    milestone_id: milestone.uid,
    grant_id: milestone.refUID ?? null,
    days_vs_due_date: daysVsDueDate(milestone.endsAt),
    has_proof: deliverables > 0,
  });
}

/** A grant admin marking a completed milestone as verified. */
export function emitMilestoneVerified(milestoneUid: string): void {
  track("milestone_verified", { milestone_id: milestoneUid });
}
