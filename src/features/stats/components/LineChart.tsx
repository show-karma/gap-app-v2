"use client";

import type { CardProps, LineChartProps, TitleProps } from "@tremor/react";
import { Card, LineChart as TremorLineChart, Title } from "@tremor/react";
import { endOfWeek, format, startOfMonth, startOfYear } from "date-fns";
import _groupBy from "lodash.groupby";
import { type FC, useMemo, useState } from "react";

import type { StatChartData, StatPeriod } from "../types";
import { formatDate } from "@/lib/format/date";

interface StatChartProps {
  title: string;
  cardProps?: CardProps;
  titleProps?: TitleProps;
  chartProps: Omit<LineChartProps, "data">;
  divStyle: string;
  statChartData: StatChartData;
  period: StatPeriod;
}

const groupByPeriod = (
  data: StatChartData["data"],
  periodToGroup: StatPeriod
) => {
  const groupedData = _groupBy(data, (item: any) => {
    const date = new Date(item.Date);
    if (periodToGroup === "Weeks") {
      return formatDate(endOfWeek(date), "UTC");
    }
    if (periodToGroup === "Months") {
      return format(startOfMonth(date), "MMM yyyy");
    }
    if (periodToGroup === "Years") {
      return format(startOfYear(date), "yyyy");
    }
    return item.Date;
  });

  const groupedDataArray = Object.entries(groupedData).map(([key, value]) => {
    let valueKey = "";
    const values = (value as any).map(
      (item: { Date: any; [key: string]: number }) => {
        const keys = Object.keys(item);
        const rightKey = keys.filter((keyItem) => keyItem !== "Date")[0];
        if (!rightKey) return 0;
        valueKey = rightKey;
        let counter = 0;
        counter += item[rightKey] as number;
        return counter;
      }
    );
    const sum = values.reduce((acc: number, curr: number) => acc + curr, 0);
    return {
      [valueKey]: sum,
      Date: key,
    };
  });

  return groupedDataArray;
};

export const LineChart: FC<StatChartProps> = ({
  chartProps,
  cardProps,
  title,
  titleProps,
  divStyle,
  statChartData,
  period,
}) => {
  const [periodData, setPeriodData] = useState(statChartData.data);

  const groupBy = (periodToGroup: StatPeriod) => {
    const groupedDataArray = groupByPeriod(statChartData.data, periodToGroup);
    setPeriodData(groupedDataArray);
  };

  useMemo(() => {
    groupBy(period);
  }, [period]);

  return (
    <div className={divStyle}>
      <Card {...cardProps}>
        <Title {...titleProps}>{title}</Title>
        <TremorLineChart data={periodData} {...chartProps} />
      </Card>
    </div>
  );
};
