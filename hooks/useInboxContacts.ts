import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useGranteeContacts } from "@/hooks/useGranteeContacts";
import { communityAdminsService } from "@/services/community-admins.service";
import { getProject } from "@/services/project.service";
import { extractApplicantName, extractContactChannels } from "@/utilities/applicationContacts";

export interface InboxContact {
  name: string;
  email: string | null;
  telegram: string | null;
  address: string | null;
  role?: string;
}

export interface InboxContactsResult {
  applicationContact: InboxContact | null;
  members: InboxContact[];
  isLoading: boolean;
}

/**
 * Aggregates the contacts a reviewer might need for a milestone: the
 * application's point-of-contact (name + channels from the form) plus the
 * project's members — combining the application's invited team members and the
 * project's on-chain members, deduplicated by email or wallet address.
 */
export function useInboxContacts(opts: {
  referenceNumber?: string;
  applicationData?: Record<string, unknown> | null;
  applicantEmail?: string | null;
  projectUidOrSlug?: string;
}): InboxContactsResult {
  const { referenceNumber, applicationData, applicantEmail, projectUidOrSlug } = opts;

  const grantee = useGranteeContacts(referenceNumber);

  const projectMembers = useQuery({
    queryKey: ["inbox-project-member-contacts", projectUidOrSlug],
    enabled: Boolean(projectUidOrSlug),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<InboxContact[]> => {
      const project = await getProject(projectUidOrSlug ?? "");
      if (!project) return [];
      const ownerAddress = project.owner?.toLowerCase() ?? null;
      const addresses = Array.from(
        new Set(
          [project.owner, ...(project.members?.map((m) => m.address) ?? [])]
            .filter((a): a is string => Boolean(a))
            .map((a) => a.toLowerCase())
        )
      );
      if (addresses.length === 0) return [];
      const profiles = await communityAdminsService
        .getPublicUserProfiles(addresses)
        .catch(() => new Map<string, { name: string; email?: string }>());
      return addresses.map((address) => {
        const profile = profiles.get(address);
        return {
          name: profile?.name?.trim() || "",
          email: profile?.email?.trim() || null,
          telegram: null,
          address,
          role: address === ownerAddress ? "Owner" : "Member",
        };
      });
    },
  });

  return useMemo(() => {
    const granteeContacts = grantee.data ?? [];
    const applicant = granteeContacts.find((c) => c.kind === "applicant");
    const channels = extractContactChannels(applicationData, applicantEmail);
    const applicationName = extractApplicantName(applicationData) || applicant?.name || "";

    const applicationContact: InboxContact | null =
      applicationName || channels.email || applicant?.address
        ? {
            name: applicationName || "Applicant",
            email: channels.email || applicant?.email || null,
            telegram: channels.telegram,
            address: applicant?.address ?? null,
            role: "Application contact",
          }
        : null;

    const rawMembers: InboxContact[] = [
      ...granteeContacts
        .filter((c) => c.kind === "member")
        .map((c) => ({
          name: c.name,
          email: c.email || null,
          telegram: null,
          address: c.address || null,
          role: c.role,
        })),
      ...(projectMembers.data ?? []),
    ];

    // Dedupe by email OR wallet address: a person listed under one channel in
    // one source and another channel in another source is still one person.
    const seenEmails = new Set<string>();
    const seenAddresses = new Set<string>();
    const markSeen = (c: InboxContact) => {
      if (c.email) seenEmails.add(c.email.toLowerCase());
      if (c.address) seenAddresses.add(c.address.toLowerCase());
    };
    const isSeen = (c: InboxContact) =>
      (!!c.email && seenEmails.has(c.email.toLowerCase())) ||
      (!!c.address && seenAddresses.has(c.address.toLowerCase()));

    if (applicationContact) markSeen(applicationContact);
    const members: InboxContact[] = [];
    for (const member of rawMembers) {
      if (!member.email && !member.address) continue;
      if (isSeen(member)) continue;
      markSeen(member);
      members.push(member);
    }

    return {
      applicationContact,
      members,
      isLoading: grantee.isLoading || projectMembers.isLoading,
    };
  }, [
    grantee.data,
    grantee.isLoading,
    projectMembers.data,
    projectMembers.isLoading,
    applicationData,
    applicantEmail,
  ]);
}
