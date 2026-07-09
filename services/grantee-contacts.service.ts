import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * A single grantee contact returned by the backend endpoint
 * GET /v2/funding-applications/:referenceNumber/grantee-contacts
 */
export interface GranteeContact {
  kind: "applicant" | "member";
  role: "Owner" | "Member";
  email: string;
  name: string;
  address: string;
}

interface GranteeContactsResponse {
  contacts: GranteeContact[];
}

/**
 * Service for fetching grantee contacts for a funding application.
 * Authentication is required — the endpoint returns contacts for the
 * applicant and all team members associated with the application.
 */
export const granteeContactsService = {
  async getContacts(referenceNumber: string): Promise<GranteeContact[]> {
    try {
      // TODO(#1775): add zod schema
      const data = await api.get<GranteeContactsResponse>(
        INDEXER.V2.FUNDING_APPLICATIONS.GRANTEE_CONTACTS(referenceNumber)
      );
      return data?.contacts ?? [];
    } catch (error) {
      throw new Error(httpErrorMessage(error) || "Failed to load grantee contacts");
    }
  },
};
