export interface ProgramImpactDatapoint {
  value: number;
  proof: string;
  outputTimestamp: string | null;
  running?: number;
}

export interface ImpactIndicator {
  programId: string;
  grantUID: string;
  grantTitle: string;
  amount: string;
  projectUID: string;
  projectTitle: string;
  projectSlug: string;
  impactIndicatorId: string;
  impactSegmentId: string;
  indicatorName: string;
  indicatorDescription: string;
  indicatorUnitOfMeasure: string;
  impactSegmentName: string;
  impactSegmentDescription: string;
  impactSegmentType: "output" | "outcome";
  categoryId: string;
  categoryName: string;
  datapoints: ProgramImpactDatapoint[];
}
export interface ProgramImpactSegment {
  categoryName: string;
  impactSegmentName: string;
  impactSegmentId: string;
  impactSegmentDescription: string;
  impactSegmentType: "output" | "outcome";
  impactIndicatorIds: string[];
  indicators?: ImpactIndicator[]; // Keep for backward compatibility
}

export interface ProgramImpactDataResponse {
  categoryName: string;
  // outputs: ProgramImpactOutput[];
  impacts: ProgramImpactSegment[];
}

export interface ProgramImpactData {
  stats: {
    totalCategories: number;
    totalProjects: number;
    totalFundingAllocated: string;
  };
  data: ProgramImpactDataResponse[];
}

export interface ImpactAggregateDatapoint {
  outputTimestamp: string;
  avg_value: number;
  total_value: number;
  min_value: number;
  max_value: number;
}

export interface ImpactAggregateIndicator {
  impactIndicatorId: string;
  indicatorName: string;
  indicatorDescription: string;
  indicatorUnitOfMeasure: string;
  impactSegmentName: string;
  impactSegmentDescription: string;
  impactSegmentType: "outcome" | "output";
  impactSegmentId: string;
  categoryId: string;
  categoryName: string;
  amount?: string;
  datapoints: ImpactAggregateDatapoint[];
}

export interface ImpactAggregateSegment {
  categoryName: string;
  impactSegmentName: string;
  impactSegmentId: string;
  impactSegmentDescription: string;
  impactSegmentType: "output" | "outcome";
  indicators: ImpactAggregateIndicator[];
}

export interface ImpactAggregateData {
  categoryName: string;
  impacts: ImpactAggregateSegment[];
}
