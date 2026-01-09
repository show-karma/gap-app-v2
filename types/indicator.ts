/**
 * Shared types for impact indicator components
 */

/**
 * Raw datapoint from the API
 */
export interface RawDatapoint {
  value: number | string;
  breakdown?: string;
  startDate: string;
  endDate: string;
}

/**
 * Period-based datapoint interface
 * Works with datapoints that have a `period` field (30d, 90d, 180d, 1y, monthly)
 */
export interface PeriodDatapoint {
  value: number | string;
  breakdown?: string | Record<string, unknown>;
  period?: string | null;
  startDate: string;
  endDate: string;
}

/**
 * API response types for indicator endpoints
 */
export interface Datapoint {
  id: string;
  value: string;
  breakdown: string | null;
  startDate: string;
  endDate: string;
  period: string | null;
  proof: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedDatapointResponse {
  indicatorId: string;
  indicatorName: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  projectCount: number;
}

export interface ProjectIndicatorResponse {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  hasData: boolean;
  lastUpdatedAt: string | null;
  datapoints: Datapoint[];
  aggregatedData?: Record<string, AggregatedDatapointResponse[]>;
}

export interface ProjectIndicatorsResponse {
  projectUID: string;
  indicators: ProjectIndicatorResponse[];
}

export interface CommunityAggregatedIndicatorResponse {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  totalProjects: number;
  aggregatedData: AggregatedDatapointResponse[];
}

export interface CommunityAggregateResponse {
  communityUID: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  indicators: CommunityAggregatedIndicatorResponse[];
}
