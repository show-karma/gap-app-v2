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
