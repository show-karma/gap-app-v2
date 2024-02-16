"use client";

import { getGAPWeeklyActiveUsers } from "@/utilities/indexer/stats";
import { Card, LineChart, Title } from "@tremor/react";
import { useEffect, useState } from "react";

export const WeeklyActiveUsersChart = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response: any = await getGAPWeeklyActiveUsers();
      const formattedData = response.map((item: any) => ({
        // eslint-disable-next-line no-underscore-dangle
        Date: `Week ${item._id.week}, ${item._id.year}`,
        "Weekly Active Users": item["Weekly Active Users"],
      }));
      setData(formattedData);
      setIsLoading(false);
    };
    fetchData();
  }, [setData, setIsLoading]);

  return (
    <div className="flex max-w-7xl flex-col items-center justify-center">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Card className="">
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
