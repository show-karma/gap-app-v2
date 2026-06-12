import type { TimeframeOption } from "./TimeframeSelector";

interface TimeframeConfig {
  label: string;
  value: TimeframeOption;
  months?: number;
}

export const timeframeOptions: TimeframeConfig[] = [
  { label: "All", value: "all" },
  { label: "1 Month", value: "1_month", months: 1 },
  { label: "3 Months", value: "3_months", months: 3 },
  { label: "6 Months", value: "6_months", months: 6 },
  { label: "1 Year", value: "1_year", months: 12 },
];
