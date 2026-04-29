import type {
  SlackOAuthMember,
  SlackOAuthRegisterWorkspaceInput,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";
import fetchData from "@/utilities/fetchData";
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

export interface TestWorkspaceResponse {
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
    const [data, error, , status] = await fetchData<SlackOAuthWorkspace>(
      INDEXER.SLACK_OAUTH.WORKSPACE(slug),
      "GET",
      {},
      {},
      {},
      true
    );
    if (status === 404) return null;
    if (error) throw new Error(error);
    return data ?? null;
  },

  async registerWorkspace(
    slug: string,
    input: SlackOAuthRegisterWorkspaceInput
  ): Promise<SlackOAuthWorkspace> {
    const [data, error] = await fetchData<SlackOAuthWorkspace>(
      INDEXER.SLACK_OAUTH.WORKSPACE(slug),
      "POST",
      input,
      {},
      {},
      true
    );
    if (error) throw new Error(error);
    if (!data) throw new Error("Register returned empty response");
    return data;
  },

  async deleteWorkspace(slug: string, uid: string): Promise<void> {
    const [, error] = await fetchData<void>(
      INDEXER.SLACK_OAUTH.WORKSPACE_BY_UID(slug, uid),
      "DELETE",
      {},
      {},
      {},
      true
    );
    if (error) throw new Error(error);
  },

  async testWorkspace(slug: string, uid: string): Promise<TestWorkspaceResponse> {
    const [data, error] = await fetchData<TestWorkspaceResponse>(
      INDEXER.SLACK_OAUTH.WORKSPACE_TEST(slug, uid),
      "POST",
      {},
      {},
      {},
      true
    );
    if (error) throw new Error(error);
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
    const [data, error] = await fetchData<{ authorizeUrl: string }>(
      INDEXER.SLACK_OAUTH.AUTHORIZE_URL(slug),
      "GET",
      {},
      {},
      {},
      true
    );
    if (error) throw new Error(error);
    if (!data?.authorizeUrl) {
      throw new Error("Authorize URL response was empty");
    }
    return data.authorizeUrl;
  },

  async searchMembers(
    slug: string,
    uid: string,
    q: string,
    limit = 20
  ): Promise<{ items: SlackOAuthMember[]; total: number }> {
    const [data, error] = await fetchData<{
      items: SlackOAuthMember[];
      total: number;
    }>(INDEXER.SLACK_OAUTH.WORKSPACE_MEMBERS(slug, uid), "GET", {}, { q, limit }, {}, true);
    if (error) throw new Error(error);
    return data ?? { items: [], total: 0 };
  },
};
