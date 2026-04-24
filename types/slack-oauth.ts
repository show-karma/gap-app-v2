/**
 * API response types for the Slack OAuth admin surface.
 * Must mirror the Zod schemas in gap-indexer:
 *   gap-indexer/app/modules/v2/api/routes/slack-oauth/slack-oauth.schemas.ts
 *
 * Critically, the workspace response has no `botTokenEncrypted` /
 * `botToken` field — the server-side mapper omits it and a snapshot
 * test asserts no `xoxb-` substring ever appears in serialized output.
 */

export type SlackOAuthWorkspaceStatus = "ACTIVE" | "REVOKED" | "ERROR";

export type SlackOAuthUserLinkSource =
  | "MANUAL"
  | "HANDLE_LOOKUP"
  | "EMAIL_LOOKUP"
  | "OAUTH_LINK";

export interface SlackOAuthWorkspace {
  uid: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  scopes: string[];
  status: SlackOAuthWorkspaceStatus;
  statusReason: string | null;
  installedByUserId: string;
  installedAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  revokedAt: string | null;
}

export interface SlackOAuthUserLink {
  uid: string;
  karmaUserId: string;
  slackWorkspaceUid: string;
  slackUserId: string;
  slackHandleSnapshot: string | null;
  linkedAt: string;
  linkSource: SlackOAuthUserLinkSource;
  lastDeliveryAt: string | null;
  lastDeliveryError: string | null;
}

export interface SlackOAuthMember {
  slackUserId: string;
  displayName: string;
  realName: string;
  email?: string;
  isBot: boolean;
  deleted: boolean;
}

/** Ambiguous-handle 409 payload from POST /user-links. */
export interface SlackOAuthHandleCandidate {
  slackUserId: string;
  displayName: string;
  realName: string;
}

export interface SlackOAuthHandleAmbiguousResponse {
  error: string;
  message: string;
  handle: string;
  candidates: SlackOAuthHandleCandidate[];
}

export interface SlackOAuthRegisterWorkspaceInput {
  teamId: string;
  teamName: string;
  botUserId: string;
  botToken: string;
  scopes?: string[];
}

export type SlackOAuthLinkInput =
  | { karmaUserId: string; handle: string }
  | { karmaUserId: string; slackUserId: string };

export interface SlackOAuthUserLinksListResponse {
  items: SlackOAuthUserLink[];
  total: number;
  page: number;
  limit: number;
}
