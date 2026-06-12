import { formatDate } from "@/utilities/formatDate";

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
          rawTimestamp: timestamp, // Keep original for sorting
          date: formatDate(new Date(timestamp), "UTC"),
          [name]: Number(values[index]) || 0,
          Cumulative: Number(runningValues[index]) || 0,
          proof: proofs?.[index] || "",
        };
      }
      return {
        rawTimestamp: timestamp, // Keep original for sorting
        date: formatDate(new Date(timestamp), "UTC"),
        [name]: Number(values[index]) || 0,
        proof: proofs?.[index] || "",
      };
    })
    .sort((a, b) => new Date(a.rawTimestamp).getTime() - new Date(b.rawTimestamp).getTime())
    .map(({ rawTimestamp: _, ...rest }) => rest); // Remove rawTimestamp from output
  return chartData;
};
