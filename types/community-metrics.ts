export interface CommunityMetricDatapoint {
  date: string;
  value: string;
  proof: string | null;
}

export interface CommunityMetric {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  sourceField: string | null;
  metadata: Record<string, unknown> | null;
  datapoints: CommunityMetricDatapoint[];
  latestValue: string | null;
  latestDate: string | null;
  datapointCount: number;
}

export interface CommunityMetricsResponse {
  communityUID: string;
  metrics: CommunityMetric[];
  totalMetrics: number;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Raw API response structure from the community-metrics endpoint
 */
export interface CommunityMetricsRawResponse {
  communityUID: string;
  data: CommunityMetricsRawDatapoint[];
  totalRecords: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  isStale: boolean;
  lastUpdatedAt: string;
}

/**
 * Raw datapoint from the API - contains date and all metric values as properties
 * Field names match the actual API response (camelCase)
 * Values can be either strings or numbers - transformation handles both
 */
export interface CommunityMetricsRawDatapoint {
  date: string;
  sectorOnboardingRawPowerPibs?: string | number; // Daily Data Onboarding (PiB)
  clientsWithActiveDataGt1Tibs?: string | number; // Clients with 1 TiB or more active data (count)
  dealStorageCostFil?: string | number; // Total FIL in Paid Deals (FIL)
  totalValueFil?: string | number; // Total Value Flow - transaction values (FIL)
  totalGasUsedMillions?: string | number; // Total Value Flow - gas usage (FIL, in millions)
  totalValueFlow?: string | number; // Alternative: pre-combined total value flow (if API provides it)
  // Additional metric fields can be added here as the API evolves
  [key: string]: string | number | undefined;
}
