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

/**
 * Re-expresses a target as the input that would recreate it, keeping a kept
 * suggestion marked as one. Only "Slack not connected" has no input: it is
 * recomputed, never sent.
 */
export function toFollowUpTargetInput(target: FollowUpTarget): FollowUpTargetInput | null {
  switch (target.kind) {
    case "dm":
      return {
        kind: "dm",
        teamId: target.teamId,
        slackUserId: target.slackUserId,
        personName: target.personName,
        ...(target.source === "suggested" &&
          target.matchedBy &&
          target.matchedBy !== "manual" && { matchedBy: target.matchedBy }),
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
      if (target.reason === "author_not_connected") return null;
      return {
        kind: "unresolved",
        reason: target.reason,
        candidates: target.candidates,
        personName: target.personName,
      };
  }
}

export function toFollowUpTargetInputs(targets: FollowUpTarget[]): FollowUpTargetInput[] {
  return targets
    .map(toFollowUpTargetInput)
    .filter((entry): entry is FollowUpTargetInput => entry !== null);
}

const PERMALINK_PARTS = /\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})/i;

/**
 * What a pick from the destination dialog looks like before the server has
 * checked it, so an unsaved note can show it straight away.
 */
export function previewFollowUpTarget(
  input: Exclude<FollowUpTargetInput, { kind: "unresolved" }>,
  label: string
): FollowUpTarget {
  switch (input.kind) {
    case "dm":
      return {
        kind: "dm",
        teamId: input.teamId,
        slackUserId: input.slackUserId,
        displayName: label,
        matchedBy: "manual",
        personName: input.personName,
        source: "manual",
      };
    case "channel":
      return {
        kind: "channel",
        teamId: input.teamId,
        channelId: input.channelId,
        channelName: label,
        personName: input.personName,
        source: "manual",
      };
    case "thread": {
      const parts = PERMALINK_PARTS.exec(input.permalink);
      return {
        kind: "thread",
        teamId: input.teamId,
        channelId: parts?.[1] ?? "",
        threadTs: parts ? `${parts[2]}.${parts[3]}` : "",
        permalink: input.permalink,
        personName: input.personName,
        source: "manual",
      };
    }
  }
}

/** The server's own message for a rejected save, when it sent one. */
export function serverErrorMessage(error: unknown, fallback: string): string {
  const body = (error as { body?: unknown } | null)?.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
