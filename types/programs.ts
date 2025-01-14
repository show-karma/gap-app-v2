export interface ProgramImpactDatapoint {
  value: string;
  proof: string;
  outputTimestamp: string | null;
}
export interface ProgramImpactDataResponse {
  categoryName: string;
  outputs: {
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
  }[];
}

export interface ProgramImpactData {
  stats: {
    totalCategories: number;
    totalProjects: number;
    totalFundingAllocated: string;
  };
  data: ProgramImpactDataResponse[];
}
