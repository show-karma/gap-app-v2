"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { type FC, useState } from "react";
import InviteGranteeModal from "@/components/FundingPlatform/ApplicationView/InviteGranteeModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type GranteeContact, useGranteeContacts } from "@/hooks/useGranteeContacts";
import { useInviteApplicationGrantee } from "@/hooks/useInviteApplicationGrantee";
import { useApplicationAccess } from "@/src/features/applications/hooks/use-application-access";

interface ApplicationCoApplicantsProps {
  communityId: string;
  referenceNumber: string;
}

function coApplicantsOf(contacts: GranteeContact[]): GranteeContact[] {
  const seen = new Set<string>();
  const ordered = [...contacts].sort(
    (a, b) => Number(b.kind === "applicant") - Number(a.kind === "applicant")
  );
  return ordered.filter((contact) => {
    const key = (contact.email || contact.address).trim().toLowerCase();
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return contact.kind === "member";
  });
}

export const ApplicationCoApplicants: FC<ApplicationCoApplicantsProps> = ({
  communityId,
  referenceNumber,
}) => {
  const { data = [], isLoading, isError, refetch } = useGranteeContacts(referenceNumber);
  const access = useApplicationAccess(communityId, referenceNumber);
  const { inviteGrantee, isInviting } = useInviteApplicationGrantee(referenceNumber);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const coApplicants = coApplicantsOf(data);
  const canAdd = !access.isLoading && (access.isOwner || access.canAdminister);

  return (
    <div className="basis-full">
      <dt className="text-xs text-gray-500 dark:text-gray-400">Co-applicants</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-gray-600 dark:text-gray-400">
        {isLoading ? (
          <Skeleton className="h-5 w-64" aria-label="Loading co-applicants" />
        ) : isError ? (
          <span className="flex items-center gap-2">
            <span>Couldn't load co-applicants.</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary-600 dark:text-primary-400"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </span>
        ) : coApplicants.length === 0 ? (
          <span>None</span>
        ) : (
          <ul aria-label="Co-applicants" className="contents">
            {coApplicants.map((contact) => (
              <li key={contact.address || contact.email} className="min-w-0 break-words">
                <span className="text-gray-900 dark:text-gray-200">
                  {contact.name || contact.email}
                </span>
                {contact.email && contact.name && (
                  <span className="block text-gray-500 sm:ml-1.5 sm:inline dark:text-gray-400">
                    {contact.email}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {canAdd && !isLoading && !isError && (
          <Button
            variant="link"
            size="sm"
            className="h-auto gap-1 p-0 text-primary-600 dark:text-primary-400"
            onClick={() => setIsAddOpen(true)}
          >
            <PlusIcon aria-hidden="true" />
            Add co-applicant
          </Button>
        )}
      </dd>
      {canAdd && (
        <InviteGranteeModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onInviteGrantee={inviteGrantee}
          isInviting={isInviting}
          onInvited={() => setIsAddOpen(false)}
          title="Add co-applicant"
        />
      )}
    </div>
  );
};
