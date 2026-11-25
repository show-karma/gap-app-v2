"use client";

import { ArrowTopRightOnSquareIcon, ChartBarIcon, LinkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type FC, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicationTrackRecord,
  useProjectIndicatorSeries,
} from "@/hooks/useApplicationInsights";
import { PAGES } from "@/utilities/pages";
import { FundingHistory, SummaryStrip } from "./FundingHistory";
import { ActivitySection, CommitmentsSection } from "./IndicatorSections";
import { buildActivity, buildCommitments, summarizeTrackRecord } from "./insightsModel";
import { SimReviews } from "./SimReviews";

export interface ApplicationInsightsPanelProps {
  referenceNumber: string;
  onOpenSimocracyTab?: () => void;
}

const PanelHeader: FC<{ subtitle: string; projectHref?: string }> = ({ subtitle, projectHref }) => (
  <div className="flex flex-wrap items-start justify-between gap-2">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Applications Insights
        </h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
    {projectHref ? (
      <Link
        href={projectHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900 dark:text-white dark:decoration-zinc-500 dark:hover:decoration-white"
      >
        Open project on Karma
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
      </Link>
    ) : null}
  </div>
);

const NoProjectState: FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 px-6 py-12 text-center dark:border-zinc-700">
    <LinkIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
    <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
    <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
  </div>
);

const PanelSkeleton: FC = () => (
  <output className="flex flex-col gap-6" aria-label="Loading insights">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-40 w-full" />
  </output>
);

export const ApplicationInsightsPanel: FC<ApplicationInsightsPanelProps> = ({
  referenceNumber,
  onOpenSimocracyTab,
}) => {
  const trackRecord = useApplicationTrackRecord(referenceNumber);
  const projectUID = trackRecord.data?.status === "available" ? trackRecord.data.projectUID : null;
  const indicators = useProjectIndicatorSeries(projectUID);
  const now = useMemo(() => new Date(), []);

  const grants = trackRecord.data?.grants ?? [];
  const summary = useMemo(() => summarizeTrackRecord(grants, now), [grants, now]);
  const commitments = useMemo(
    () => buildCommitments(indicators.data ?? [], now),
    [indicators.data, now]
  );
  const activity = useMemo(() => buildActivity(indicators.data ?? [], now), [indicators.data, now]);

  if (trackRecord.isPending) return <PanelSkeleton />;

  if (trackRecord.isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">
          The project's track record didn't load. Try again in a moment.
        </p>
        <Button variant="outline" size="sm" onClick={() => trackRecord.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const record = trackRecord.data;
  if (record.status === "no_project_linked") {
    return (
      <div className="flex flex-col gap-5">
        <PanelHeader subtitle="Track record of the Karma project linked on the application." />
        <NoProjectState
          title="No Karma project linked"
          description="The applicant didn't link a Karma project on this application, so there is no funding history, metrics or activity to show."
        />
      </div>
    );
  }

  if (record.status === "project_not_found") {
    return (
      <div className="flex flex-col gap-5">
        <PanelHeader subtitle="Track record of the Karma project linked on the application." />
        <NoProjectState
          title="Linked project not found"
          description="The application links a Karma project that no longer exists or hasn't been indexed yet."
        />
      </div>
    );
  }

  const projectName = record.project?.title ?? "the linked project";
  const commitmentCounts = indicators.data
    ? {
        met: commitments.filter((commitment) => commitment.met).length,
        withTarget: commitments.filter((commitment) => commitment.met !== null).length,
        withoutTarget: commitments.filter((commitment) => commitment.met === null).length,
      }
    : null;
  const sectionState = {
    isLoading: indicators.isPending,
    isError: indicators.isError,
    onRetry: () => indicators.refetch(),
  };

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-5">
        <PanelHeader
          subtitle={`Track record of ${projectName}, the Karma project linked on the application. Data comes straight from Karma; nothing here is AI-generated.`}
          projectHref={
            record.project
              ? PAGES.PROJECT.OVERVIEW(record.project.slug ?? record.project.uid)
              : undefined
          }
        />
        <SummaryStrip grants={grants} summary={summary} commitments={commitmentCounts} />
      </div>
      <FundingHistory grants={grants} now={now} />
      <CommitmentsSection commitments={commitments} {...sectionState} />
      <ActivitySection indicators={activity} {...sectionState} />
      <SimReviews referenceNumber={referenceNumber} onOpenSimocracyTab={onOpenSimocracyTab} />
    </div>
  );
};
