import type { Application } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches an application's status history with the caller's auth token.
 *
 * The whitelabel application page is server-rendered without a Privy token, so
 * the backend serves that request anonymously and strips the private
 * status-change reasons (rejection/revision messages). Calling this from the
 * client with the viewer's token lets the backend — which is the access guard —
 * return the reasons to the applicant, reviewers, and admins, and to no one
 * else. This only re-requests the authenticated view; it makes no access
 * decision of its own.
 *
 * `api.get` throws on failure (network, timeout, 4xx/5xx) so React Query keeps
 * `data` undefined and callers fall back to the sanitized SSR
 * `application.statusHistory`. Resolving to `[]` here would win the `?? `
 * fallback and blank the timeline for authorized viewers on a transient
 * re-fetch failure.
 */
export async function getApplicationStatusHistory(
  referenceNumber: string
): Promise<Application["statusHistory"]> {
  // TODO(#1775): add zod schema
  const application = await api.get<Application>(
    INDEXER.V2.FUNDING_APPLICATIONS.GET(referenceNumber)
  );
  return application?.statusHistory ?? [];
}
