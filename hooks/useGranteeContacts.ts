import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { granteeContactsService } from "@/services/grantee-contacts.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export type { GranteeContact } from "@/services/grantee-contacts.service";

/**
 * Fetches grantee contacts (applicant + team members) for a funding application.
 *
 * Mirrors the pattern used by useMilestoneReviewers / useProgramReviewers:
 * - Requires authentication (disabled when unauthenticated or referenceNumber is falsy)
 * - Single fetch keyed on referenceNumber
 * - Returns the raw useQuery result so callers can inspect isLoading / isError
 */
export function useGranteeContacts(referenceNumber: string | undefined) {
  const { authenticated } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.GRANTEE_CONTACTS(referenceNumber ?? ""),
    queryFn: () => granteeContactsService.getContacts(referenceNumber!),
    enabled: !!referenceNumber && authenticated,
  });
}
