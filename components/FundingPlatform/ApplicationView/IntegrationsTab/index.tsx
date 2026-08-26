"use client";

import { ArrowPathIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import type { FC } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  useApplicationIntegrations,
  useSimocracyEvaluations,
} from "@/hooks/useApplicationIntegrations";
import { SimocracyEvaluationCard } from "./SimocracyEvaluationCard";

export interface IntegrationsTabProps {
  referenceNumber: string;
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
}

const SimocracySection: FC<SimocracySectionProps> = ({ referenceNumber }) => {
  const { data, isLoading, isError, error, refetch } = useSimocracyEvaluations(referenceNumber);

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
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Simocracy — {count} {pluralize("sim evaluation", count)}
        </h3>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500" title="Run id">
          Run {data.runId}
        </span>
      </div>
      {data.evaluations.map((evaluation) => (
        <SimocracyEvaluationCard key={evaluation.sim.simUri} evaluation={evaluation} />
      ))}
    </div>
  );
};

export const IntegrationsTab: FC<IntegrationsTabProps> = ({ referenceNumber }) => {
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

  const hasSimocracy = data.some((integration) => integration.key === "simocracy");

  return (
    <div className="space-y-6">
      {hasSimocracy ? (
        <SimocracySection referenceNumber={referenceNumber} />
      ) : (
        <EmptyState
          title="No supported integrations"
          description="None of this program's integrations are supported in this view yet."
        />
      )}
    </div>
  );
};

export default IntegrationsTab;
