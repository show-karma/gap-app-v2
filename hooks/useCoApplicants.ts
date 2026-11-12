import { useMemo } from "react";
import { type GranteeContact, useGranteeContacts } from "@/hooks/useGranteeContacts";

export function selectCoApplicants(contacts: GranteeContact[]): GranteeContact[] {
  const seenEmails = new Set<string>();
  const seenAddresses = new Set<string>();
  const isSeen = (c: GranteeContact) =>
    (!!c.email && seenEmails.has(c.email.toLowerCase())) ||
    (!!c.address && seenAddresses.has(c.address.toLowerCase()));
  const markSeen = (c: GranteeContact) => {
    if (c.email) seenEmails.add(c.email.toLowerCase());
    if (c.address) seenAddresses.add(c.address.toLowerCase());
  };

  for (const applicant of contacts.filter((c) => c.kind === "applicant")) markSeen(applicant);

  return contacts
    .filter((c) => c.kind === "member")
    .filter((member) => {
      if (isSeen(member)) return false;
      markSeen(member);
      return true;
    });
}

export function useCoApplicants(referenceNumber: string | undefined) {
  const query = useGranteeContacts(referenceNumber);
  const coApplicants = useMemo(() => selectCoApplicants(query.data ?? []), [query.data]);
  return { ...query, coApplicants };
}
