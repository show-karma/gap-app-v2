import { formatDate } from "@/lib/format/date";

interface ChartDataPoint {
  date: string;
  [key: string]: any;
}

export function prepareChartData(
  values: number[],
  dates: string[],
  seriesName: string,
  aggregateFunction?: "sum" | "average" | "count",
  proofs?: string[]
): ChartDataPoint[] {
  if (!values || !dates || values.length === 0 || dates.length === 0) {
    return [];
  }

  // Group data by date
  const dataByDate = new Map<string, { values: number[]; proofs?: string[] }>();
  
  dates.forEach((date, index) => {
    const formattedDate = formatDate(new Date(date), "UTC");
    const existing = dataByDate.get(formattedDate) || { values: [], proofs: [] };
    existing.values.push(values[index]);
    if (proofs?.[index]) {
      existing.proofs?.push(proofs[index]);
    }
    dataByDate.set(formattedDate, existing);
  });

  // Convert to chart data format
  const chartData: ChartDataPoint[] = [];
  
  dataByDate.forEach((data, date) => {
    let value: number;
    
    switch (aggregateFunction) {
      case "sum":
        value = data.values.reduce((sum, val) => sum + val, 0);
        break;
      case "average":
        value = data.values.reduce((sum, val) => sum + val, 0) / data.values.length;
        break;
      case "count":
        value = data.values.length;
        break;
      default:
        // Default to using the last value for the date
        value = data.values[data.values.length - 1];
    }
    
    const dataPoint: ChartDataPoint = {
      date,
      [seriesName]: value,
    };
    
    // Add proof if available
    if (data.proofs && data.proofs.length > 0) {
      dataPoint.proof = data.proofs[data.proofs.length - 1];
    }
    
    chartData.push(dataPoint);
  });

  // Sort by date
  chartData.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  return chartData;
}