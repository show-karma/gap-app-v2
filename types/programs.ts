export interface ProgramImpactDatapoint {
  value: number;
  proof: string;
  outputTimestamp: string | null;
  running?: number;
}
export interface ProgramImpactOutput {
  chainID: number;
  grantUID: string;
  grantTitle: string;
  projectUID: string;
  projectTitle: string;
  projectSlug: string;
  amount: string;
  outputId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  datapoints: ProgramImpactDatapoint[];
  lastUpdated: string;
  type?: "output" | "outcome";
}

export interface ProgramImpactDataResponse {
  categoryName: string;
  outputs: ProgramImpactOutput[];
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
