"use client";

import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoHint, InsightsEmpty, InsightsSection, StatusPill } from "./InsightsPrimitives";
import {
  type Commitment,
  formatDate,
  formatNumber,
  type IndicatorSeries,
  type SeriesPoint,
} from "./insightsModel";
import { Sparkline } from "./Sparkline";

const ACTIVITY_INITIAL_COUNT = 6;

interface SectionState {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const SectionLoading: FC = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);

const SectionError: FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <InsightsEmpty
    title="Couldn't load indicators"
    description="The project's indicators didn't load. Try again in a moment."
    action={
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    }
  />
);

const OPERATOR_SYMBOLS: Record<string, string> = {
  "<=": "≤",
  ">=": "≥",
  "<": "<",
  ">": ">",
  "=": "=",
  "==": "=",
};

function operatorSymbol(operator: string | null): string {
  return operator ? (OPERATOR_SYMBOLS[operator] ?? operator) : "";
}

const TrendDelta: FC<{ points: SeriesPoint[] }> = ({ points }) => {
  const first = points[0];
  const latest = points.at(-1);
  if (!first || !latest || points.length < 2) return null;
  const change = latest.value - first.value;
  if (change === 0) return null;
  const since = formatDate(first.date, false);
  const Icon = change > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const amount =
    first.value !== 0
      ? `${Math.abs(Math.round((change / Math.abs(first.value)) * 100))}%`
      : formatNumber(Math.abs(change));
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {change > 0 ? "Up" : "Down"} {amount} since {since}
    </span>
  );
};

const TargetStatus: FC<{ commitment: Commitment }> = ({ commitment }) => {
  const value = `${formatNumber(commitment.latestValue)}${commitment.unit ? ` ${commitment.unit}` : ""}`;
  if (commitment.met === null) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        <StatusPill tone="gray">No target yet</StatusPill>
        <InfoHint label="No target yet">
          This commitment is tracked, but its target has not been set yet. Targets come from the
          grant agreement and appear here once it is signed.
        </InfoHint>
      </span>
    );
  }
  const target = `${operatorSymbol(commitment.operator)} ${formatNumber(commitment.target ?? 0)}${commitment.unit ? ` ${commitment.unit}` : ""}`;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <StatusPill tone={commitment.met ? "green" : "red"}>
        {commitment.met ? "Meeting target" : "Below target"}
      </StatusPill>
      <InfoHint label={commitment.met ? "Meeting target" : "Below target"}>
        {commitment.met
          ? `The latest reading (${value}) meets the committed target of ${target}.`
          : `The latest reading (${value}) misses the committed target of ${target}.`}
      </InfoHint>
    </span>
  );
};

const CommitmentCard = memo(function CommitmentCard({ commitment }: { commitment: Commitment }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-gray-200 p-4 dark:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {commitment.name}
          </span>
          {commitment.statement ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">{commitment.statement}</span>
          ) : null}
        </div>
        <TargetStatus commitment={commitment} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
          {formatNumber(commitment.latestValue)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {[
            commitment.unit,
            commitment.target !== null
              ? `target ${operatorSymbol(commitment.operator)} ${formatNumber(commitment.target)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <TrendDelta points={commitment.points} />
      <Sparkline
        points={commitment.points}
        unit={commitment.unit}
        target={commitment.target}
        targetLabel={
          commitment.target !== null
            ? `Target ${operatorSymbol(commitment.operator)} ${formatNumber(commitment.target)}`
            : null
        }
        label={`${commitment.name} trend, latest ${formatNumber(commitment.latestValue)}`}
      />
    </div>
  );
});

export const CommitmentsSection: FC<{ commitments: Commitment[] } & SectionState> = ({
  commitments,
  isLoading,
  isError,
  onRetry,
}) => (
  <InsightsSection
    title="Committed metrics"
    meta={commitments.length ? "Indicators with a committed target" : undefined}
  >
    {isLoading ? (
      <SectionLoading />
    ) : isError ? (
      <SectionError onRetry={onRetry} />
    ) : commitments.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {commitments.map((commitment) => (
          <CommitmentCard key={commitment.id} commitment={commitment} />
        ))}
      </div>
    ) : (
      <InsightsEmpty
        title="No committed metrics"
        description="None of this project's indicators carries a committed target. Targets come from the program's Kernel commitments."
      />
    )}
  </InsightsSection>
);

const ActivityCard = memo(function ActivityCard({ indicator }: { indicator: IndicatorSeries }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-gray-200 p-4 dark:border-zinc-700">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{indicator.name}</span>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
            {formatNumber(indicator.latestValue)}
          </span>
          {indicator.unit ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">{indicator.unit}</span>
          ) : null}
        </div>
        <TrendDelta points={indicator.points} />
      </div>
      <Sparkline
        points={indicator.points}
        unit={indicator.unit}
        label={`${indicator.name} trend`}
      />
      <span className="mt-auto text-xs text-gray-500 dark:text-gray-400">
        Last reported {formatDate(indicator.latestDate)}
      </span>
    </div>
  );
});

export const ActivitySection: FC<{ indicators: IndicatorSeries[] } & SectionState> = ({
  indicators,
  isLoading,
  isError,
  onRetry,
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? indicators : indicators.slice(0, ACTIVITY_INITIAL_COUNT);

  return (
    <InsightsSection
      title="Activity and network impact"
      meta={
        indicators.length
          ? `${pluralize("indicator", indicators.length, true)} on Karma`
          : undefined
      }
    >
      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <SectionError onRetry={onRetry} />
      ) : indicators.length ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((indicator) => (
              <ActivityCard key={indicator.id} indicator={indicator} />
            ))}
          </div>
          {indicators.length > ACTIVITY_INITIAL_COUNT ? (
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)}>
                {showAll
                  ? "Show fewer"
                  : `Show all ${pluralize("indicator", indicators.length, true)}`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <InsightsEmpty
          title="No indicators reported yet"
          description="This project has no impact or activity indicators on Karma. GitHub and on-chain indicators appear here once they sync."
        />
      )}
    </InsightsSection>
  );
};
