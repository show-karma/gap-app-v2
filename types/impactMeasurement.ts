/**
 * Aggregated datapoint from materialized views
 */
export interface AggregatedDatapoint {
  indicatorId: string;
  indicatorName: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  projectCount: number;
}

export interface ImpactIndicatorWithData {
  id: string;
  /** PostgreSQL UUID - use this for impact segments when available */
  uuid?: string | null;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt?: string;
  updatedAt?: string;
  programs: {
    programId: string;
    chainID: number;
  }[];
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
    outputTimestamp?: string;
    breakdown?: string;
    /**
     * Period type for rolling metrics (e.g., "30d", "90d", "180d", "1y", "monthly")
     * Used for indicators like "Unique users" that have period-based datapoints
     */
    period?: string | null;
  }[];
  hasData: boolean;
  isAssociatedWithPrograms: boolean;
  /**
   * Aggregated data by period (e.g., { monthly: [...], weekly: [...] })
   * FE can use Object.keys() to get available periods
   */
  aggregatedData?: Record<string, AggregatedDatapoint[]>;
}

export interface ImpactIndicator {
  id: string;
  /** PostgreSQL UUID - use this for impact segments when available */
  uuid?: string | null;
  name: string;
  description: string;
  programs?: {
    programId: string;
    chainID: number;
  }[];
  unitOfMeasure: string;
  syncType?: "auto" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

export interface ImpactSegment {
  id: string;
  name: string;
  description: string;
  type: "output" | "outcome";
  impact_indicators?: ImpactIndicator[];
}

export interface Category {
  id: string;
  name: string;
  impact_segments?: ImpactSegment[];
  outputs?: {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    type: "output" | "outcome";
  }[];
}
