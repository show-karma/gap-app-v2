import type { SlackUserConnection } from "@/types/slack-oauth";

export interface SlackAvailability {
  status: "loading" | "connected" | "disconnected";
  settingsHref: string;
}

export const AUTO_FOLLOW_UP_LABEL = "Auto follow-up on Slack";

export function slackAvailabilityStatus(
  isLoading: boolean,
  connections: SlackUserConnection[] | undefined
): SlackAvailability["status"] {
  if (isLoading) return "loading";
  return connections && connections.length > 0 ? "connected" : "disconnected";
}
