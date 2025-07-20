import { useQuery } from "@tanstack/react-query";
import { envVars } from "@/config/env";
import { OSOMetricsResponse } from "../types";

const OSO_API_URL = "https://www.opensource.observer/api/v1/graphql";

const fetchOSOMetrics = async (
  slugs: string[]
): Promise<OSOMetricsResponse> => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${envVars.OSO_API_KEY}`,
  };

  const whereCondition = {
    projectName: {
      _in: slugs,
    },
  };

  const response = await fetch(OSO_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `
               query FetchOSOMetrics(
                  $where1: Oso_CodeMetricsByProjectV1BoolExp
                  $where2: Oso_OnchainMetricsByProjectV1BoolExp
                ) {
                  oso_codeMetricsByProjectV1(where: $where1) {
                    displayName
                    developerCount
                    contributorCount
                    commitCount6Months
                    commentCount6Months
                    closedIssueCount6Months
                    activeDeveloperCount6Months
                    contributorCount6Months
                    eventSource
                    firstCommitDate
                    firstCreatedAtDate
                    forkCount
                    fulltimeDeveloperAverage6Months
                    lastCommitDate
                    lastUpdatedAtDate
                    mergedPullRequestCount6Months
                    newContributorCount6Months
                    openedIssueCount6Months
                    openedPullRequestCount6Months
                    releaseCount6Months
                    repositoryCount
                    projectSource
                    starCount
                    timeToFirstResponseDaysAverage6Months
                    timeToMergeDaysAverage6Months
                  }
                  oso_onchainMetricsByProjectV1(where: $where2) {
                    activeContractCount90Days
                    addressCount
                    addressCount90Days
                    daysSinceFirstTransaction
                    displayName
                    eventSource
                    gasFeesSum
                    gasFeesSum6Months
                    highActivityAddressCount90Days
                    lowActivityAddressCount90Days
                    mediumActivityAddressCount90Days
                    multiProjectAddressCount90Days
                    newAddressCount90Days
                    projectId
                    projectName
                    projectNamespace
                    projectSource
                    returningAddressCount90Days
                    transactionCount
                    transactionCount6Months
                  }
                }
            `,
      variables: {
        where1: whereCondition,
        where2: whereCondition,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OSO metrics");
  }

  const data = await response.json();
  return data.data;
};

export const useOSOMetrics = (slugs: string[]) => {
  return useQuery({
    queryKey: ["oso-metrics", slugs],
    queryFn: () => fetchOSOMetrics(slugs),
    enabled: slugs.length > 0 && !!envVars.OSO_API_KEY,
  });
};
