/**
 * Pure visibility logic for the "Milestone Update" section inside
 * `MilestoneCard`. Lives outside the component so it can be unit-tested
 * without a full render + mock harness.
 *
 * The rule we encode:
 *   - A milestone-shaped entry (project / grant / project-milestone) that
 *     is marked completed always renders the section, even when there's
 *     no completion narrative — the inner renderer shows "—" so the
 *     timeline still surfaces the completion event.
 *   - Other activity-card types (update / grant_update / activity / impact)
 *     keep the legacy "render only when there's content" gate, since they
 *     don't have a "completed" state in the milestone sense.
 */

export type MilestoneCardActivityType =
  | "milestone"
  | "grant"
  | "project"
  | "update"
  | "impact"
  | "activity"
  | "grant_update"
  | "grant_received"
  | "endorsement";

export interface MilestoneCardCompletionGateInput {
  type: MilestoneCardActivityType | string;
  /** From `milestone.completed` — boolean for fresh shapes, object for v1 */
  completed: unknown;
  completionReason: unknown;
  completionProof: unknown;
  completionDeliverables: unknown;
  isCompleting: boolean;
  isEditing: boolean;
}

export interface MilestoneCardCompletionGate {
  /** Whether the whole "Milestone Update" section renders. */
  showSection: boolean;
  /**
   * Whether the timeline header (badge dot + "Posted X by Y") renders
   * inside the section. Suppressed during the completion form input flow.
   */
  showTimelineHeader: boolean;
}

const MILESTONE_LIKE_TYPES = new Set<string>(["milestone", "grant", "project"]);

export function computeMilestoneCardCompletionGate(
  input: MilestoneCardCompletionGateInput
): MilestoneCardCompletionGate {
  const isCompletedMilestoneEntry =
    MILESTONE_LIKE_TYPES.has(input.type) && Boolean(input.completed);
  const hasCompletionContent = Boolean(
    input.completionReason || input.completionProof || input.completionDeliverables
  );
  const showSection =
    input.isCompleting || input.isEditing || isCompletedMilestoneEntry || hasCompletionContent;
  const showTimelineHeader =
    !input.isCompleting && (isCompletedMilestoneEntry || hasCompletionContent);
  return { showSection, showTimelineHeader };
}
