import type { SlackOAuthRegisterWorkspaceInput, SlackOAuthWorkspace } from "@/types/slack-oauth";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * API service for the Slack OAuth admin surface. Owns all HTTP calls;
 * hooks (`hooks/useSlackOauth.ts`) wrap these with React Query and
 * should never call `fetchData` directly.
 *
 * Per-user Slack handle mapping lives on `user_profiles.slack` (Mongo)
 * and is managed in the user-profile UI elsewhere — this service only
 * deals with workspace-level concerns.
 */

interface TestWorkspaceResponse {
  teamId: string;
  botUserId: string;
}

export const slackOauthService = {
  /**
   * GET the active workspace for a community. Returns `null` on 404
   * (empty state for the UI) instead of throwing — admins may legitimately
   * not have registered one yet.
   */
  async getWorkspace(slug: string): Promise<SlackOAuthWorkspace | null> {
    try {
      // TODO(#1775): add zod schema
      const data = await api.get<SlackOAuthWorkspace>(INDEXER.SLACK_OAUTH.WORKSPACE(slug));
      return data ?? null;
    } catch (error) {
      if (isApiError(error) && error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  },

  async registerWorkspace(
    slug: string,
    input: SlackOAuthRegisterWorkspaceInput
  ): Promise<SlackOAuthWorkspace> {
    // TODO(#1775): add zod schema
    const data = await api.post<SlackOAuthWorkspace>(INDEXER.SLACK_OAUTH.WORKSPACE(slug), input);
    if (!data) throw new Error("Register returned empty response");
    return data;
  },

  async deleteWorkspace(slug: string, uid: string): Promise<void> {
    await api.delete(INDEXER.SLACK_OAUTH.WORKSPACE_BY_UID(slug, uid));
  },

  async testWorkspace(slug: string, uid: string): Promise<TestWorkspaceResponse> {
    // TODO(#1775): add zod schema
    const data = await api.post<TestWorkspaceResponse>(
      INDEXER.SLACK_OAUTH.WORKSPACE_TEST(slug, uid),
      {}
    );
    if (!data) throw new Error("Test returned empty response");
    return data;
  },

  /**
   * Fetch the Slack-side authorize URL for the distributed-install
   * flow (Segment 2). The endpoint is Karma-authed; we can't use a
   * plain `<a href>` for the install button because link clicks don't
   * carry the JWT, and we can't `fetch('/install')` because fetch
   * can't follow the cross-origin 302 to slack.com. Solution: this
   * endpoint returns the URL as JSON, and the caller does
   * `window.location.href = authorizeUrl` to navigate.
   */
  async getSlackAuthorizeUrl(slug: string): Promise<string> {
    // TODO(#1775): add zod schema
    const data = await api.get<{ authorizeUrl: string }>(INDEXER.SLACK_OAUTH.AUTHORIZE_URL(slug));
    if (!data?.authorizeUrl) {
      throw new Error("Authorize URL response was empty");
    }
    return data.authorizeUrl;
  },
};
