/**
 * Where an action item's auto follow-up goes. Mirrors
 * `gap-indexer/app/modules/v2/domain/models/follow-up-target.ts`.
 */
export type FollowUpTargetSource = "suggested" | "manual";

export type FollowUpMatchedBy =
  | "program_reviewer"
  | "application_team"
  | "applicant"
  | "slack_directory"
  | "manual";

interface FollowUpTargetBase {
  personName?: string;
  source: FollowUpTargetSource;
}

export interface FollowUpDmTarget extends FollowUpTargetBase {
  kind: "dm";
  teamId: string;
  slackUserId: string;
  displayName: string;
  matchedBy?: FollowUpMatchedBy;
}

export interface FollowUpChannelTarget extends FollowUpTargetBase {
  kind: "channel";
  teamId: string;
  channelId: string;
  channelName: string;
}

export interface FollowUpThreadTarget extends FollowUpTargetBase {
  kind: "thread";
  teamId: string;
  channelId: string;
  channelName?: string;
  threadTs: string;
  permalink: string;
}

export interface FollowUpUnresolvedTarget extends FollowUpTargetBase {
  kind: "unresolved";
  reason: "not_found" | "ambiguous" | "author_not_connected";
  candidates: string[];
}

export type FollowUpTarget =
  | FollowUpDmTarget
  | FollowUpChannelTarget
  | FollowUpThreadTarget
  | FollowUpUnresolvedTarget;

export type FollowUpTargetInput =
  | { kind: "dm"; teamId: string; slackUserId: string; personName?: string }
  | { kind: "channel"; teamId: string; channelId: string; personName?: string }
  | { kind: "thread"; teamId: string; permalink: string; personName?: string };

export interface FollowUpWorkspace {
  teamId: string;
  teamName: string;
  /** False when the connection predates channel scopes; reconnect to pick one. */
  canPickDestination: boolean;
}

export interface FollowUpChannel {
  channelId: string;
  name: string;
  isPrivate: boolean;
  isGroupDm: boolean;
}

export interface FollowUpMember {
  slackUserId: string;
  displayName: string;
}
