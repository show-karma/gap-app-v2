/* eslint-disable @next/next/no-img-element */
import { FC } from "react";
import { useOSOMetrics } from "../hooks/use-oso-metrics";
import { MetricCard } from "./metric-card";
import {
  ExclamationCircleIcon,
  UserGroupIcon,
  CodeBracketIcon,
  StarIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  DocumentCheckIcon,
  DocumentPlusIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  UserPlusIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";

type MetricConfig = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  tooltip: string;
  isFormatted?: boolean;
};

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

export const OSOMetrics: FC<{ osoSlugs: string[] }> = ({ osoSlugs }) => {
  const { data, isLoading, error } = useOSOMetrics(osoSlugs);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <ExclamationCircleIcon className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Error</h3>
            <p className="text-sm">Failed to load OSO metrics</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-[104px] w-full animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    );
  }

  const codeMetrics = data?.oso_codeMetricsByProjectV1?.[0] || null;
  const onchainMetrics = data?.oso_onchainMetricsByProjectV1?.[0] || null;

  if (!data || (!codeMetrics && !onchainMetrics)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-800">
          <ExclamationCircleIcon className="h-5 w-5" />
          <div>
            <h3 className="font-medium">No Data</h3>
            <p className="text-sm">No OSO metrics found for this project</p>
          </div>
        </div>
      </div>
    );
  }

  const getCodeMetrics = (): MetricConfig[] => {
    if (!codeMetrics) return [];

    const metrics: MetricConfig[] = [];

    if (codeMetrics.contributorCount > 0) {
      metrics.push({
        title: "Contributors",
        value: codeMetrics.contributorCount,
        icon: <UserGroupIcon className="h-4 w-4" />,
        tooltip: "Total number of unique contributors",
      });
    }

    if (codeMetrics.activeDeveloperCount6Months > 0) {
      metrics.push({
        title: "Active Contributors (6m)",
        value: codeMetrics.activeDeveloperCount6Months,
        icon: <CodeBracketIcon className="h-4 w-4" />,
        tooltip: "Number of active contributors in the last 6 months",
      });
    }

    if (codeMetrics.starCount > 0) {
      metrics.push({
        title: "Stars",
        value: codeMetrics.starCount,
        icon: <StarIcon className="h-4 w-4" />,
        tooltip: "Total number of GitHub stars",
      });
    }

    if (codeMetrics.forkCount > 0) {
      metrics.push({
        title: "Forks",
        value: codeMetrics.forkCount,
        icon: <ArrowPathIcon className="h-4 w-4" />,
        tooltip: "Total number of repository forks",
      });
    }

    if (codeMetrics.commitCount6Months > 0) {
      metrics.push({
        title: "Commits (6m)",
        value: codeMetrics.commitCount6Months,
        icon: <CodeBracketIcon className="h-4 w-4" />,
        tooltip: "Number of commits in the last 6 months",
      });
    }

    if (codeMetrics.commentCount6Months > 0) {
      metrics.push({
        title: "Comments (6m)",
        value: codeMetrics.commentCount6Months,
        icon: <ChatBubbleLeftIcon className="h-4 w-4" />,
        tooltip: "Number of comments in the last 6 months",
      });
    }

    if (codeMetrics.closedIssueCount6Months > 0) {
      metrics.push({
        title: "Closed Issues (6m)",
        value: codeMetrics.closedIssueCount6Months,
        icon: <DocumentCheckIcon className="h-4 w-4" />,
        tooltip: "Number of closed issues in the last 6 months",
      });
    }

    if (codeMetrics.openedIssueCount6Months > 0) {
      metrics.push({
        title: "Opened Issues (6m)",
        value: codeMetrics.openedIssueCount6Months,
        icon: <DocumentPlusIcon className="h-4 w-4" />,
        tooltip: "Number of opened issues in the last 6 months",
      });
    }

    if (codeMetrics.mergedPullRequestCount6Months > 0) {
      metrics.push({
        title: "Merged PRs (6m)",
        value: codeMetrics.mergedPullRequestCount6Months,
        icon: <ArrowTrendingUpIcon className="h-4 w-4" />,
        tooltip: "Number of merged pull requests in the last 6 months",
      });
    }

    if (codeMetrics.openedPullRequestCount6Months > 0) {
      metrics.push({
        title: "Opened PRs (6m)",
        value: codeMetrics.openedPullRequestCount6Months,
        icon: <DocumentPlusIcon className="h-4 w-4" />,
        tooltip: "Number of opened pull requests in the last 6 months",
      });
    }

    if (codeMetrics.releaseCount6Months > 0) {
      metrics.push({
        title: "Releases (6m)",
        value: codeMetrics.releaseCount6Months,
        icon: <ArrowTrendingUpIcon className="h-4 w-4" />,
        tooltip: "Number of releases in the last 6 months",
      });
    }

    if (codeMetrics.timeToFirstResponseDaysAverage6Months > 0) {
      metrics.push({
        title: "Time to First Response",
        value: `${codeMetrics.timeToFirstResponseDaysAverage6Months.toFixed(
          1
        )}d`,
        icon: <ClockIcon className="h-4 w-4" />,
        tooltip: "Average time to first response in days (last 6 months)",
        isFormatted: true,
      });
    }

    if (codeMetrics.timeToMergeDaysAverage6Months > 0) {
      metrics.push({
        title: "Time to Merge",
        value: `${codeMetrics.timeToMergeDaysAverage6Months.toFixed(1)}d`,
        icon: <ClockIcon className="h-4 w-4" />,
        tooltip: "Average time to merge pull requests in days (last 6 months)",
        isFormatted: true,
      });
    }

    if (codeMetrics.fulltimeDeveloperAverage6Months > 0) {
      metrics.push({
        title: "Full-time Developers",
        value: codeMetrics.fulltimeDeveloperAverage6Months,
        icon: <UserGroupIcon className="h-4 w-4" />,
        tooltip: "Average number of full-time developers in the last 6 months",
      });
    }

    return metrics;
  };

  const getOnchainMetrics = (): MetricConfig[] => {
    if (!onchainMetrics) return [];

    const metrics: MetricConfig[] = [];

    if (onchainMetrics.addressCount > 0) {
      metrics.push({
        title: "Total Addresses",
        value: onchainMetrics.addressCount,
        icon: <UserGroupIcon className="h-4 w-4" />,
        tooltip: "Total number of unique addresses",
      });
    }

    if (onchainMetrics.addressCount90Days > 0) {
      metrics.push({
        title: "Active Addresses (90d)",
        value: onchainMetrics.addressCount90Days,
        icon: <UserGroupIcon className="h-4 w-4" />,
        tooltip: "Number of active addresses in the last 90 days",
      });
    }

    if (onchainMetrics.newAddressCount90Days > 0) {
      metrics.push({
        title: "New Addresses (90d)",
        value: onchainMetrics.newAddressCount90Days,
        icon: <UserPlusIcon className="h-4 w-4" />,
        tooltip: "Number of new addresses in the last 90 days",
      });
    }

    if (onchainMetrics.returningAddressCount90Days > 0) {
      metrics.push({
        title: "Returning Addresses (90d)",
        value: onchainMetrics.returningAddressCount90Days,
        icon: <ArrowLeftOnRectangleIcon className="h-4 w-4" />,
        tooltip: "Number of returning addresses in the last 90 days",
      });
    }

    if (onchainMetrics.highActivityAddressCount90Days > 0) {
      metrics.push({
        title: "High Activity Addresses (90d)",
        value: onchainMetrics.highActivityAddressCount90Days,
        icon: <ArrowTrendingUpIcon className="h-4 w-4" />,
        tooltip: "Number of high activity addresses in the last 90 days",
      });
    }

    if (onchainMetrics.mediumActivityAddressCount90Days > 0) {
      metrics.push({
        title: "Medium Activity Addresses (90d)",
        value: onchainMetrics.mediumActivityAddressCount90Days,
        icon: <ArrowTrendingUpIcon className="h-4 w-4" />,
        tooltip: "Number of medium activity addresses in the last 90 days",
      });
    }

    if (onchainMetrics.lowActivityAddressCount90Days > 0) {
      metrics.push({
        title: "Low Activity Addresses (90d)",
        value: onchainMetrics.lowActivityAddressCount90Days,
        icon: <ArrowTrendingUpIcon className="h-4 w-4" />,
        tooltip: "Number of low activity addresses in the last 90 days",
      });
    }

    if (onchainMetrics.multiProjectAddressCount90Days > 0) {
      metrics.push({
        title: "Multi-Project Addresses (90d)",
        value: onchainMetrics.multiProjectAddressCount90Days,
        icon: <BuildingLibraryIcon className="h-4 w-4" />,
        tooltip:
          "Number of addresses active in multiple projects in the last 90 days",
      });
    }

    if (onchainMetrics.activeContractCount90Days > 0) {
      metrics.push({
        title: "Active Contracts (90d)",
        value: onchainMetrics.activeContractCount90Days,
        icon: <DocumentCheckIcon className="h-4 w-4" />,
        tooltip: "Number of active contracts in the last 90 days",
      });
    }

    if (onchainMetrics.transactionCount6Months > 0) {
      metrics.push({
        title: "Transactions (6m)",
        value: onchainMetrics.transactionCount6Months,
        icon: <CodeBracketIcon className="h-4 w-4" />,
        tooltip: "Number of transactions in the last 6 months",
      });
    }

    const gasFees6Months = parseFloat(onchainMetrics.gasFeesSum6Months);
    if (gasFees6Months > 0) {
      metrics.push({
        title: "Gas Fees (6m)",
        value: gasFees6Months,
        icon: <CurrencyDollarIcon className="h-4 w-4" />,
        tooltip: "Total gas fees in the last 6 months",
      });
    }

    const totalGasFees = parseFloat(onchainMetrics.gasFeesSum);
    if (totalGasFees > 0) {
      metrics.push({
        title: "Total Gas Fees",
        value: totalGasFees,
        icon: <CurrencyDollarIcon className="h-4 w-4" />,
        tooltip: "Total gas fees all time",
      });
    }

    return metrics;
  };

  const codeMetricsList = getCodeMetrics();
  const onchainMetricsList = getOnchainMetrics();

  return (
    <div className="space-y-6">
      {codeMetricsList.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Code Activity</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {codeMetricsList.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={
                  metric.isFormatted
                    ? metric.value
                    : formatNumber(metric.value as number)
                }
                icon={metric.icon}
                tooltip={metric.tooltip}
              />
            ))}
          </div>
        </>
      )}

      {onchainMetricsList.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">On-chain Activity</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {onchainMetricsList.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={
                  metric.isFormatted
                    ? metric.value
                    : formatNumber(metric.value as number)
                }
                icon={metric.icon}
                tooltip={metric.tooltip}
              />
            ))}
          </div>
        </>
      )}

      {codeMetricsList.length === 0 && onchainMetricsList.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-gray-800">
            <ExclamationCircleIcon className="h-5 w-5" />
            <div>
              <h3 className="font-medium">No Activity</h3>
              <p className="text-sm">
                No activity metrics found for this project
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
