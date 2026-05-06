"use client";

import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { MilestoneCompletionEditor } from "@/src/features/applications/components/MilestoneCompletionEditor";
import { formatFieldLabel } from "@/src/features/applications/lib/milestone-utils";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { Application, MilestoneData } from "@/types/whitelabel-entities";

interface MilestonesTabProps {
  application: Application;
  isOwner: boolean;
  invoiceRequired?: boolean;
}

function isMilestoneArray(value: unknown): value is MilestoneData[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    "title" in value[0]
  );
}

export function MilestonesTab({ application, isOwner, invoiceRequired }: MilestonesTabProps) {
  const milestoneFields = Object.entries(application.applicationData).filter(([_, value]) =>
    isMilestoneArray(value)
  ) as [string, MilestoneData[]][];

  // Fetch the rich GrantMilestoneWithDetails (carries `canAttest`, `grant.uid`,
  // `chainId`, completion + verification details) for the linked project.
  // Required by the on-chain attestation flow — milestoneStatuses alone gives
  // status badges but not the SDK-shaped milestone needed to sign.
  const { rawData } = useProjectUpdates(application.projectUID ?? "");

  // Filter to the grant milestones that match this application's linked
  // milestoneUIDs. Done by UID — title matching is unreliable and the project
  // can have grants from other programs in the same response.
  const linkedMilestoneUIDs = new Set(
    milestoneFields.flatMap(([_, items]) =>
      items
        .map((m) => m.milestoneUID)
        .filter((uid): uid is string => typeof uid === "string" && uid.length > 0)
    )
  );
  const grantMilestones: GrantMilestoneWithDetails[] = (rawData?.grantMilestones ?? []).filter(
    (m) => linkedMilestoneUIDs.has(m.uid)
  );

  if (milestoneFields.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6">
        <p className="text-muted-foreground">No milestones defined for this application.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {milestoneFields.map(([fieldLabel, milestones]) => (
        <div key={fieldLabel} className="rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <h2 className="text-xl font-semibold text-foreground">
              {formatFieldLabel(fieldLabel)}
            </h2>
          </div>
          <div className="p-6">
            <MilestoneCompletionEditor
              milestones={milestones}
              fieldLabel={fieldLabel}
              referenceNumber={application.referenceNumber}
              isEditable={isOwner}
              invoiceRequired={invoiceRequired}
              milestoneStatuses={application.milestoneStatuses}
              grantMilestones={grantMilestones}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
