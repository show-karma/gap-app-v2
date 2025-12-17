export interface EcosystemMetricDatapoint {
  date: string;
  value: string;
  proof: string | null;
}

export interface EcosystemMetric {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  sourceField: string | null;
  metadata: Record<string, unknown> | null;
  datapoints: EcosystemMetricDatapoint[];
  latestValue: string | null;
  latestDate: string | null;
  datapointCount: number;
}

export interface EcosystemMetricsResponse {
  communityUID: string;
  metrics: EcosystemMetric[];
  totalMetrics: number;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}
