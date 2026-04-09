"use client";

import { MilestoneCompletionEditor } from "@/src/features/applications/components/MilestoneCompletionEditor";
import { formatFieldLabel } from "@/src/features/applications/lib/milestone-utils";
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
            />
          </div>
        </div>
      ))}
    </div>
  );
}
