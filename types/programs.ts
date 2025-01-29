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
  indicators: ImpactIndicator[];
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

export interface ImpactAggregateOutput {
  outputId: string;
  name: string;
  type: "output" | "outcome";
  categoryId: string;
  categoryName: string;
  datapoints: ImpactAggregateDatapoint[];
}

export interface ImpactAggregateData {
  categoryName: string;
  outputs: ImpactAggregateOutput[];
}
