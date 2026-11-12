"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import InviteGranteeModal from "@/components/FundingPlatform/ApplicationView/InviteGranteeModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoApplicants } from "@/hooks/useCoApplicants";
import { useInviteApplicationGrantee } from "@/hooks/useInviteApplicationGrantee";
import { useApplicationAccess } from "@/src/features/applications/hooks/use-application-access";

interface ApplicationCoApplicantsSectionProps {
  communityId: string;
  referenceNumber: string;
}

export function ApplicationCoApplicantsSection({
  communityId,
  referenceNumber,
}: ApplicationCoApplicantsSectionProps) {
  const { coApplicants, isLoading, isError, refetch } = useCoApplicants(referenceNumber);
  const access = useApplicationAccess(communityId, referenceNumber);
  const { inviteGrantee, isInviting } = useInviteApplicationGrantee(referenceNumber);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canAdd = !access.isLoading && (access.isOwner || access.canAdminister);

  return (
    <section aria-labelledby="co-applicants-heading">
      <div className="mb-3 mt-5 flex items-center justify-between gap-3">
        <p
          id="co-applicants-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Co-applicants
        </p>
        {canAdd && !isLoading && !isError && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add co-applicant
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-9 w-full" aria-label="Loading co-applicants" />
      ) : isError ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>Couldn't load co-applicants.</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : coApplicants.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {canAdd
            ? "No co-applicants yet. Add teammates so they can view and edit this application."
            : "None"}
        </p>
      ) : (
        <ul aria-label="Co-applicants" className="flex flex-col gap-3">
          {coApplicants.map((contact) => {
            const label = contact.name || contact.email || contact.address;
            return (
              <li key={contact.address || contact.email} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {label.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">{label}</div>
                  {contact.name && contact.email && (
                    <div className="truncate text-xs text-muted-foreground">{contact.email}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canAdd && (
        <InviteGranteeModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onInviteGrantee={inviteGrantee}
          isInviting={isInviting}
          onInvited={() => setIsAddOpen(false)}
        />
      )}
    </section>
  );
}
