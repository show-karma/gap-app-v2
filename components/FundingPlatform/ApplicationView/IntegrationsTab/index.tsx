"use client";

import { ArrowPathIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import type { FC } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  useApplicationIntegrations,
  useSimocracyEvaluations,
  useSimocracyProgramSummary,
  useSimocracySimLinks,
} from "@/hooks/useApplicationIntegrations";
import { useAuth } from "@/hooks/useAuth";
import { isIntegrationEnabled } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { CouncilEvaluations } from "./CouncilEvaluations";

export interface IntegrationsTabProps {
  referenceNumber: string;
  /** Enables sim-evaluation feedback controls (manage view; admin-scoped). */
  feedbackAdmin?: boolean;
}

const LoadingSkeleton: FC = () => (
  <div className="space-y-4 animate-pulse" data-testid="integrations-loading">
    {[0, 1].map((row) => (
      <div
        key={row}
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5 space-y-3"
      >
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-4 w-full rounded bg-gray-100 dark:bg-zinc-700" />
        <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-zinc-700" />
      </div>
    ))}
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
    <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
    <Button onClick={onRetry} className="mt-4 inline-flex items-center gap-2">
      <ArrowPathIcon className="h-4 w-4" />
      Retry
    </Button>
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
}

const EmptyState: FC<EmptyStateProps> = ({ title, description }) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-8 text-center">
    <PuzzlePieceIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);

interface SimocracySectionProps {
  referenceNumber: string;
  feedbackAdmin?: boolean;
}

const SimocracySection: FC<SimocracySectionProps> = ({ referenceNumber, feedbackAdmin }) => {
  const { data, isLoading, isError, error, refetch } = useSimocracyEvaluations(referenceNumber);
  const { data: summary } = useSimocracyProgramSummary(data?.programId ?? "");
  const { address } = useAuth();
  const { data: simLinks } = useSimocracySimLinks(data?.programId ?? "", {
    enabled: !!feedbackAdmin && !!data?.programId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load Simocracy evaluations."}
        onRetry={() => refetch()}
      />
    );
  }

  if (data.runId === null) {
    return (
      <EmptyState
        title="The round hasn't run yet"
        description="Sim evaluations will appear here once a Simocracy round runs for this program."
      />
    );
  }

  if (data.evaluations.length === 0) {
    return (
      <EmptyState
        title="No sim evaluations synced yet"
        description="This application has no sim evaluations in the latest run."
      />
    );
  }

  const count = data.evaluations.length;

  return (
    <div className="space-y-4">
      <SimocracySectionHeader
        count={count}
        linkedCount={summary?.sims?.length}
        programId={data.programId}
        runId={data.runId}
        proposalUri={data.evaluations[0]?.proposalUri}
      />
      <CouncilEvaluations
        evaluations={data.evaluations}
        linkedSims={summary?.sims}
        feedback={
          feedbackAdmin && data.runId
            ? {
                referenceNumber,
                runId: data.runId,
                viewerAddresses: new Set(address ? [address.toLowerCase()] : []),
                canGiveFeedback: (simUri: string) => {
                  if (feedbackAdmin) return true;
                  const link = (simLinks ?? []).find((l) => l.simUri === simUri);
                  return (
                    !!link &&
                    !!address &&
                    link.publicAddress.toLowerCase() === address.toLowerCase()
                  );
                },
              }
            : undefined
        }
      />
    </div>
  );
};

interface SimocracySectionHeaderProps {
  count: number;
  linkedCount?: number;
  programId: string;
  runId: string | null;
  proposalUri?: string;
}

const SimocracySectionHeader: FC<SimocracySectionHeaderProps> = ({
  count,
  linkedCount,
  programId,
  runId,
  proposalUri,
}) => {
  const { data: summary } = useSimocracyProgramSummary(programId);

  const isRatified = summary?.decisionStatus === "ratified";
  const allocation =
    isRatified && proposalUri
      ? summary?.allocations?.find((entry) => entry.proposalUri === proposalUri)
      : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sim evaluations</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {typeof linkedCount === "number" && linkedCount >= count
              ? `${count} of ${linkedCount} linked ${pluralize("sim", linkedCount)} responded`
              : `${count} ${pluralize("sim", count)}`}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          How each reviewer&apos;s Sim — their AI twin on Simocracy — judged this application in the
          latest funding round.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {typeof allocation?.amount === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium tabular-nums text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Allocated ${allocation.amount.toLocaleString()}
          </span>
        )}
        {summary?.decisionStatus && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              isRatified
                ? "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            )}
          >
            {summary.decisionStatus}
          </span>
        )}
        {runId && (
          <span
            className="font-mono text-[11px] text-gray-400 dark:text-gray-500"
            title={`Mechanism run ${runId}`}
          >
            {runId.slice(0, 16)}…
          </span>
        )}
      </div>
    </div>
  );
};

export const IntegrationsTab: FC<IntegrationsTabProps> = ({ referenceNumber, feedbackAdmin }) => {
  const { data, isLoading, isError, error, refetch } = useApplicationIntegrations(referenceNumber);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load integrations."}
        onRetry={() => refetch()}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No integrations configured"
        description="This program has no integrations configured for its applications."
      />
    );
  }

  const hasSimocracy = isIntegrationEnabled(data, "simocracy");

  return (
    <div className="space-y-6">
      {hasSimocracy ? (
        <SimocracySection referenceNumber={referenceNumber} feedbackAdmin={feedbackAdmin} />
      ) : (
        <EmptyState
          title="No active integrations"
          description="None of this program's integrations are enabled for this view."
        />
      )}
    </div>
  );
};

export default IntegrationsTab;
