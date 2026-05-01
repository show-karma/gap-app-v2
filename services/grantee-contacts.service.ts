import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

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
    const [data, error] = await fetchData<GranteeContactsResponse>(
      INDEXER.V2.FUNDING_APPLICATIONS.GRANTEE_CONTACTS(referenceNumber)
    );

    if (error) {
      throw new Error(typeof error === "string" ? error : "Failed to load grantee contacts");
    }

    return data?.contacts ?? [];
  },
};
