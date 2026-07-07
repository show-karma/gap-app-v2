import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
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
 */
export async function getApplicationStatusHistory(
  referenceNumber: string
): Promise<Application["statusHistory"]> {
  const [application] = await fetchData<Application>(
    INDEXER.V2.FUNDING_APPLICATIONS.GET(referenceNumber),
    "GET"
  );
  return application?.statusHistory ?? [];
}
