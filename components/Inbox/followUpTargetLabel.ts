import type { FollowUpTarget, FollowUpTargetInput } from "@/types/follow-up-target";

/** One-line description of a saved destination, as shown on the note row. */
export function describeFollowUpTarget(target: FollowUpTarget): string {
  switch (target.kind) {
    case "dm":
      return target.displayName;
    case "channel":
      return /[\s,]/.test(target.channelName) ? target.channelName : `#${target.channelName}`;
    case "thread":
      return target.channelName ? `thread in #${target.channelName}` : "a Slack thread";
    case "unresolved":
      if (target.reason === "author_not_connected") return "Slack not connected";
      if (target.reason === "ambiguous")
        return `${target.personName ?? "Recipient"}: ${target.candidates.length} matches`;
      return target.personName ? `${target.personName} not found` : "No one to message found";
  }
}

/** Re-expresses a saved target as the input that would recreate it. */
export function toFollowUpTargetInput(target: FollowUpTarget): FollowUpTargetInput | null {
  switch (target.kind) {
    case "dm":
      return {
        kind: "dm",
        teamId: target.teamId,
        slackUserId: target.slackUserId,
        personName: target.personName,
      };
    case "channel":
      return {
        kind: "channel",
        teamId: target.teamId,
        channelId: target.channelId,
        personName: target.personName,
      };
    case "thread":
      return {
        kind: "thread",
        teamId: target.teamId,
        permalink: target.permalink,
        personName: target.personName,
      };
    case "unresolved":
      return null;
  }
}
