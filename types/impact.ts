/**
 * Types for Impact section components
 */

/**
 * Form state for editing output/outcome datapoints
 */
export interface OutputForm {
  id: string;
  categoryId: string;
  unitOfMeasure: "int" | "float";
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
    outputTimestamp?: string;
  }[];
  isEditing?: boolean;
  isSaving?: boolean;
  isEdited?: boolean;
}

/**
 * Selected data point for modal display
 * Note: values come from Tremor chart callbacks which return mixed types
 */
export interface SelectedPointData {
  value: number | string;
  date: string | number;
  proof?: string;
}

/**
 * Indicator datapoint structure from API
 */
export interface IndicatorDatapoint {
  value: number | string;
  proof: string;
  startDate: string;
  endDate: string;
  outputTimestamp?: string;
  breakdown?: string;
  period?: string | null;
}
