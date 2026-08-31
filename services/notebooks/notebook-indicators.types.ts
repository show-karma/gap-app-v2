export const NOTEBOOK_TIME_RANGE_PRESETS = ["30d", "90d", "12m", "all"] as const;

export type NotebookTimeRangePreset = (typeof NOTEBOOK_TIME_RANGE_PRESETS)[number];

export interface NotebookIndicatorOption {
  id: string;
  label: string;
  description: string;
  unit: string;
  kernelId: string | null;
  syncType: "auto" | "manual" | null;
}

export interface NotebookIndicatorCatalog {
  total: number;
  indicators: NotebookIndicatorOption[];
}

export interface NotebookTimeSeriesPoint {
  /** UTC day represented by the datapoint's endDate. */
  date: string;
  value: number;
}

export interface NotebookIndicatorSeries {
  indicator: Omit<NotebookIndicatorOption, "syncType">;
  preset: NotebookTimeRangePreset;
  points: NotebookTimeSeriesPoint[];
  /** Latest valid point before preset filtering; supports an honest empty-window state. */
  latestPoint: NotebookTimeSeriesPoint | null;
  receivedPointCount: number;
  /** Empty, null, or non-finite numeric values excluded from the chart. */
  discardedPointCount: number;
  /** Valid older corrections replaced by a later-updated row for the same day. */
  supersededPointCount: number;
}
