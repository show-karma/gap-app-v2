"use client";

import { formatDate } from "@/lib/format/date";
import { getGAPWeeklyActiveUsers } from "@/services/indexer";
import { Card, LineChart, Title } from "@tremor/react";
import { useEffect, useState } from "react";

export const WeeklyActiveUsersChart = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  function reduceDays(dateString: string, days: number) {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response: any = await getGAPWeeklyActiveUsers();
      const formattedData = response.map((item: any) => ({
        // eslint-disable-next-line no-underscore-dangle

        Date: `${formatDate(reduceDays(item.date.$date, 7))} - ${formatDate(
          item.date.$date
        )} ${item["percentileChange"] > 0 ? "🟢" : "🔴"} ${parseInt(
          item["percentileChange"]
        )}%`,
        "Weekly Active Users": item["wau"],
        "Percent Change": item["percentileChange"],
      }));
      setData(formattedData);
      setIsLoading(false);
    };
    fetchData();
  }, [setData, setIsLoading]);

  return (
    <div className="container mx-auto sm:px-0 lg:px-20 w-full flex-col items-center justify-center">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Card className="min-w-[400px]">
          <Title className="flex flex-row flex-wrap items-center gap-2">
            Weekly Active Users
          </Title>
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
