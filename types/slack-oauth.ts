/**
 * API response types for the Slack OAuth admin surface.
 * Must mirror the Zod schemas in gap-indexer:
 *   gap-indexer/app/modules/v2/api/routes/slack-oauth/slack-oauth.schemas.ts
 *
 * Critically, the workspace response has no `botTokenEncrypted` /
 * `botToken` field — the server-side mapper omits it and a snapshot
 * test asserts no `xoxb-` substring ever appears in serialized output.
 *
 * Per-user Slack handle mapping is NOT modeled here — it lives on
 * `user_profiles.slack` (Mongo) and is managed via the user-profile
 * UI elsewhere in the app.
 */

export type SlackOAuthWorkspaceStatus = "ACTIVE" | "REVOKED" | "ERROR";

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

export interface SlackOAuthRegisterWorkspaceInput {
  teamId: string;
  teamName: string;
  botUserId: string;
  botToken: string;
  scopes?: string[];
}
