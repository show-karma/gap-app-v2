import { formatDate } from "@/lib/format/date";

export const prepareChartData = (
  values: number[],
  timestamps: string[],
  name: string,
  runningValues?: number[],
  proofs?: string[]
): { date: string; [key: string]: number | string }[] => {
  const chartData = timestamps
    .map((timestamp, index) => {
      if (runningValues?.length) {
        return {
          date: formatDate(new Date(timestamp), "UTC"),
          [name]: Number(values[index]) || 0,
          Cumulative: Number(runningValues[index]) || 0,
          proof: proofs?.[index] || "",
        };
      }
      return {
        date: formatDate(new Date(timestamp), "UTC"),
        [name]: Number(values[index]) || 0,
        proof: proofs?.[index] || "",
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return chartData;
};

export const prepareChartDataTimestamp = (
  timestamps: string[],
  avg_values: number[],
  total_values: number[],
  min_values: number[],
  max_values: number[]
): { date: string; [key: string]: number | string }[] => {
  const timestampsData = timestamps
    .map((timestamp, index) => {
      return {
        date: formatDate(new Date(timestamp), "UTC"),
        Avg: Number(avg_values[index]) || 0,
        Total: Number(total_values[index]) || 0,
        Min: Number(min_values[index]) || 0,
        Max: Number(max_values[index]) || 0,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return timestampsData;
};
