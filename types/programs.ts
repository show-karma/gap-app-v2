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
    value: string[];
    proof: string[];
    outputTimestamp: string[];
    lastUpdated: string;
    type?: "output" | "outcome";
  }[];
}
