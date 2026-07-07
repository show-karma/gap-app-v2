import type { CauseId, Quest } from "../types";

export interface GrantQuestInput {
  cause: CauseId;
  recurring: boolean;
}

function questCompletesOnGrant(quest: Quest, grant: GrantQuestInput): boolean {
  if (quest.progress >= quest.goal) return false;
  const matches =
    quest.type === "grant_any" ||
    (quest.type === "grant_cause" && quest.targetCause === grant.cause) ||
    (quest.type === "recurring" && grant.recurring);
  return matches && quest.progress + 1 >= quest.goal;
}

/**
 * Quests a grant with these attributes would complete. Shared between the
 * reducer (to credit the XP) and the grant flow's "You will earn" panel (to
 * advertise it), so the promised and credited amounts can never drift apart.
 */
export function questsCompletedByGrant(quests: Quest[], grant: GrantQuestInput): Quest[] {
  return quests.filter((quest) => questCompletesOnGrant(quest, grant));
}

function questCompletesOnRead(quest: Quest): boolean {
  return (
    quest.type === "read_updates" && quest.progress < quest.goal && quest.progress + 1 >= quest.goal
  );
}

/**
 * Quests that reading one more update would complete. Shared between the
 * reducer and the impact feed's "Mark as read" buttons for the same reason
 * as {@link questsCompletedByGrant}.
 */
export function questsCompletedByRead(quests: Quest[]): Quest[] {
  return quests.filter(questCompletesOnRead);
}
