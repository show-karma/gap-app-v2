import axios from "axios";
import fetchData from "@/utilities/fetchData";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import type {
  SlackOAuthHandleAmbiguousResponse,
  SlackOAuthLinkInput,
  SlackOAuthMember,
  SlackOAuthRegisterWorkspaceInput,
  SlackOAuthUserLink,
  SlackOAuthUserLinksListResponse,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";

/**
 * API service for the Slack OAuth admin surface. Owns all HTTP calls +
 * error translation; hooks (`hooks/useSlackOauth.ts`) wrap these with
 * React Query and should never call `fetchData` / `axios` directly.
 *
 * The `linkByHandleOrMember` method uses `axios` directly (not
 * fetchData) because a 409 response carries the `candidates` list —
 * fetchData's generic catch path only exposes `message + status`, so we
 * need the raw body to surface the typed ambiguity error the UI uses
 * to render a picker.
 */

// ── Errors ────────────────────────────────────────────────────────────

/**
 * Thrown by `linkByHandleOrMember` on 409 when the backend returns
 * multiple candidate members for an ambiguous handle. Carries the
 * candidate list the UI renders as a picker.
 */
export class SlackOAuthHandleAmbiguousError extends Error {
  readonly handle: string;
  readonly candidates: SlackOAuthHandleAmbiguousResponse["candidates"];

  constructor(payload: SlackOAuthHandleAmbiguousResponse) {
    super(payload.message);
    this.name = "SlackOAuthHandleAmbiguousError";
    this.handle = payload.handle;
    this.candidates = payload.candidates;
  }
}

// ── Service ───────────────────────────────────────────────────────────

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

  async testWorkspace(
    slug: string,
    uid: string
  ): Promise<TestWorkspaceResponse> {
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

  async listUserLinks(
    slug: string,
    query: { karmaUserId?: string; page?: number; limit?: number } = {}
  ): Promise<SlackOAuthUserLinksListResponse> {
    const [data, error] = await fetchData<SlackOAuthUserLinksListResponse>(
      INDEXER.SLACK_OAUTH.USER_LINKS(slug),
      "GET",
      {},
      query,
      {},
      true
    );
    if (error) throw new Error(error);
    return (
      data ?? {
        items: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      }
    );
  },

  /**
   * Link a Karma user by handle OR member ID. Throws
   * `SlackOAuthHandleAmbiguousError` with the candidate list when
   * multiple members match an entered handle.
   */
  async linkByHandleOrMember(
    slug: string,
    input: SlackOAuthLinkInput
  ): Promise<SlackOAuthUserLink> {
    const token = await TokenManager.getToken();
    try {
      const response = await axios.post<SlackOAuthUserLink>(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SLACK_OAUTH.USER_LINKS(
          slug
        )}`,
        input,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const body = err.response.data as
          | Partial<SlackOAuthHandleAmbiguousResponse>
          | undefined;
        if (body && Array.isArray(body.candidates) && body.handle) {
          throw new SlackOAuthHandleAmbiguousError({
            error: body.error ?? "Slack Handle Ambiguous",
            message: body.message ?? "Handle matches multiple users",
            handle: body.handle,
            candidates: body.candidates,
          });
        }
      }
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          err.message;
        throw new Error(msg);
      }
      throw err;
    }
  },

  async unlinkUser(slug: string, uid: string): Promise<void> {
    const [, error] = await fetchData<void>(
      INDEXER.SLACK_OAUTH.USER_LINK_BY_UID(slug, uid),
      "DELETE",
      {},
      {},
      {},
      true
    );
    if (error) throw new Error(error);
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
    }>(
      INDEXER.SLACK_OAUTH.WORKSPACE_MEMBERS(slug, uid),
      "GET",
      {},
      { q, limit },
      {},
      true
    );
    if (error) throw new Error(error);
    return data ?? { items: [], total: 0 };
  },
};
