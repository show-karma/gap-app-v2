"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, LineChart, Title } from "@tremor/react";
import { formatDate } from "@/utilities/formatDate";
import { getGAPWeeklyActiveUsers } from "@/utilities/indexer/stats";

interface WeeklyActiveUsersData {
  Date: string;
  "Weekly Active Users": number;
  "Percent Change": number;
}

function reduceDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const WeeklyActiveUsersChart = () => {
  const { data = [], isLoading } = useQuery<WeeklyActiveUsersData[]>({
    queryKey: ["weekly-active-users"],
    queryFn: async () => {
      const response = await getGAPWeeklyActiveUsers();
      return response.map((item: any) => ({
        Date: `${formatDate(reduceDays(item.date.$date, 7))} - ${formatDate(
          item.date.$date
        )} ${item.percentileChange > 0 ? "🟢" : "🔴"} ${parseInt(item.percentileChange, 10)}%`,
        "Weekly Active Users": item.wau,
        "Percent Change": item.percentileChange,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <div className="container mx-auto sm:px-0 lg:px-20 w-full flex-col items-center justify-center">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Card className="min-w-[400px]">
          <Title className="flex flex-row flex-wrap items-center gap-2">Weekly Active Users</Title>
          <LineChart
            categories={["Weekly Active Users"]}
            data={data}
            index="Date"
            colors={["blue"]}
            className="mt-6 h-[240px] w-full max-xl:h-[200px]"
            yAxisWidth={48}
          />
        </Card>
      )}
    </div>
  );
};
