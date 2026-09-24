"use client";

import { useMemo } from "react";
import { SimComments } from "@/components/FundingPlatform/ApplicationView/IntegrationsTab/SimComments";
import { Button } from "@/components/Utilities/Button";
import { useApplicationIntegrations } from "@/hooks/useApplicationIntegrations";
import { useAuth } from "@/hooks/useAuth";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { isIntegrationEnabled } from "@/services/fundingApplicationIntegrations.service";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";

interface InboxMilestoneSimocracyTabProps {
  projectUID: string;
  milestone: { uid: string; title: string };
}

const Note = ({ children }: { children: string }) => (
  <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
    <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
  </div>
);

/**
 * Sim verdicts on one milestone, for the reviewer inbox. Resolves the grantee's
 * funding application lazily (only when this tab is mounted), then shows the
 * same verdict cards as the application's Integrations tab, narrowed to this
 * milestone. Community admins get the feedback controls.
 */
export function InboxMilestoneSimocracyTab({
  projectUID,
  milestone,
}: InboxMilestoneSimocracyTabProps) {
  const { address } = useAuth();
  const { isCommunityAdmin } = usePermissionContext();
  const { application, isLoading, error, refetch } = useFundingApplicationByProjectUID(projectUID);
  const referenceNumber = application?.referenceNumber ?? "";
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useApplicationIntegrations(referenceNumber);

  const feedback = useMemo(() => {
    if (!isCommunityAdmin || !referenceNumber) return undefined;
    return {
      referenceNumber,
      viewerAddresses: new Set(address ? [address.toLowerCase()] : []),
      canGiveFeedback: () => true,
    };
  }, [isCommunityAdmin, referenceNumber, address]);

  if (isLoading || (referenceNumber && isLoadingIntegrations)) {
    return (
      <output
        aria-label="Loading Sim evaluations"
        className="block animate-pulse space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <span className="block h-5 w-40 rounded bg-gray-200 dark:bg-zinc-700" />
        <span className="block h-4 w-full rounded bg-gray-100 dark:bg-zinc-800" />
      </output>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
        <p className="mb-3 text-sm text-red-700 dark:text-red-300">
          Failed to load Sim evaluations.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!referenceNumber) {
    return (
      <Note>
        This milestone is not tied to a funding application, so there are no Sim evaluations.
      </Note>
    );
  }

  if (!isIntegrationEnabled(integrations, "simocracy")) {
    return <Note>Simocracy is not connected to this program.</Note>;
  }

  return (
    <SimComments referenceNumber={referenceNumber} milestone={milestone} feedback={feedback} />
  );
}
