"use client";

import pluralize from "pluralize";
import { type FC, memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicationIntegrations,
  useSimocracyEvaluations,
} from "@/hooks/useApplicationIntegrations";
import { useSimocracyApplicationVerdicts } from "@/hooks/useSimocracyMilestoneVerdicts";
import {
  isIntegrationEnabled,
  type SimocracyVerdictStatus,
} from "@/services/fundingApplicationIntegrations.service";
import { InfoHint, InsightsEmpty, InsightsSection, StatusPill } from "./InsightsPrimitives";
import { formatDate, formatNumber, simFundsUpTo } from "./insightsModel";

interface SimReviewItem {
  key: string;
  simName: string;
  kind: "verdict" | "s-process";
  text: string;
  status: SimocracyVerdictStatus | null;
  updatedAt: string | null;
  fundsUpTo: number | null;
}

const STATUS_PILL: Record<
  SimocracyVerdictStatus,
  { tone: "yellow" | "green" | "gray"; label: string }
> = {
  pending_review: { tone: "yellow", label: "Pending review" },
  publishing: { tone: "yellow", label: "Publishing" },
  published: { tone: "green", label: "Published" },
  dismissed: { tone: "gray", label: "Dismissed" },
};

const SimReviewCard = memo(function SimReviewCard({
  item,
  onOpenSimocracyTab,
}: {
  item: SimReviewItem;
  onOpenSimocracyTab?: () => void;
}) {
  const pill = item.status ? STATUS_PILL[item.status] : null;
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-md border border-gray-200 p-4 dark:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-zinc-700 dark:text-gray-200"
          >
            {item.simName.charAt(0)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {item.simName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.kind === "verdict" ? "Application verdict" : "S-Process evaluation"}
              {item.updatedAt ? ` · ${formatDate(item.updatedAt)}` : ""}
            </span>
          </div>
        </div>
        {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
      </div>
      {item.fundsUpTo !== null ? (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            Would fund up to
            <InfoHint label="Would fund up to">
              The amount at which this Sim's marginal-value curve reaches zero in the S-Process
              round.
            </InfoHint>
          </span>
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            ${formatNumber(item.fundsUpTo)}
          </span>
        </div>
      ) : null}
      <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {item.text}
      </p>
      {onOpenSimocracyTab ? (
        <div>
          <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenSimocracyTab}>
            Review in the Simocracy tab
          </Button>
        </div>
      ) : null}
    </article>
  );
});

export const SimReviews: FC<{ referenceNumber: string; onOpenSimocracyTab?: () => void }> = ({
  referenceNumber,
  onOpenSimocracyTab,
}) => {
  const integrations = useApplicationIntegrations(referenceNumber);
  const simocracyEnabled = isIntegrationEnabled(integrations.data, "simocracy");
  const verdicts = useSimocracyApplicationVerdicts(referenceNumber, { enabled: simocracyEnabled });
  const evaluations = useSimocracyEvaluations(referenceNumber, { enabled: simocracyEnabled });

  const items: SimReviewItem[] = [
    ...(verdicts.data?.verdicts ?? [])
      .filter((verdict) => verdict.status !== "dismissed")
      .map((verdict) => ({
        key: verdict.verdictId,
        simName: verdict.simName || "Unnamed Sim",
        kind: "verdict" as const,
        text: verdict.text,
        status: verdict.status,
        updatedAt: verdict.updatedAt,
        fundsUpTo: null,
      })),
    ...(evaluations.data?.evaluations ?? []).map((evaluation) => ({
      key: `${evaluation.sim.simUri}-${evaluation.proposalUri}`,
      simName: evaluation.sim.simName ?? "Unnamed Sim",
      kind: "s-process" as const,
      text: evaluation.reasoning,
      status: null,
      updatedAt: null,
      fundsUpTo: simFundsUpTo(evaluation.mvf),
    })),
  ];
  const pendingCount = items.filter(
    (item) => item.status === "pending_review" || item.status === "publishing"
  ).length;

  let body: ReactNode;
  if (
    integrations.isPending ||
    (simocracyEnabled && (verdicts.isPending || evaluations.isPending))
  ) {
    body = <Skeleton className="h-32 w-full" />;
  } else if (integrations.isError || verdicts.isError || evaluations.isError) {
    body = (
      <InsightsEmpty
        title="Couldn't load Sim reviews"
        description="The Simocracy reviews didn't load. Try again in a moment."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (integrations.isError) integrations.refetch();
              if (verdicts.isError) verdicts.refetch();
              if (evaluations.isError) evaluations.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  } else if (!simocracyEnabled) {
    body = (
      <InsightsEmpty
        title="Simocracy is not enabled for this program"
        description="Sim reviews appear here when the program turns on the Simocracy integration."
      />
    );
  } else if (!items.length) {
    body = (
      <InsightsEmpty
        title="No Sim reviews yet"
        description="Sim verdicts and S-Process evaluations for this application will appear here."
      />
    );
  } else {
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <SimReviewCard key={item.key} item={item} onOpenSimocracyTab={onOpenSimocracyTab} />
        ))}
      </div>
    );
  }

  return (
    <InsightsSection
      title="Sim reviews"
      meta={
        items.length
          ? `${pluralize("Sim review", items.length, true)}${pendingCount ? ` · ${pendingCount} pending review` : ""}`
          : undefined
      }
    >
      {body}
    </InsightsSection>
  );
};
