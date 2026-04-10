// Types mirroring the gap-indexer philanthropy API DTOs

export type PhilanthropyEntityType = "foundation" | "nonprofit" | "grant";

export interface Citation {
  entityId: string;
  entityType: PhilanthropyEntityType;
  filingYear: number;
  fieldPath: string;
}

export interface EntityScores {
  semantic: number;
  amount: number;
  recency: number;
  composite: number;
}

export interface RankedEntity {
  entityType: PhilanthropyEntityType;
  id: string;
  name: string | null;
  description: string | null;
  ein: string | null;
  location: string | null;
  totalAssets: number | null;
  amount: number | null;
  date: string | null;
  filingYear: number | null;
  foundationId: string | null;
  foundationName?: string | null;
  nonprofitId: string | null;
  nonprofitName?: string | null;
  scores: EntityScores;
}

export interface QueryIntent {
  type: string;
  targetEntityType: PhilanthropyEntityType;
  referenceEntityName: string | null;
  weights: {
    semantic: number;
    amount: number;
    recency: number;
  };
}

export interface QueryPagination {
  page: number;
  limit: number;
  returned: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface QueryResponse {
  entities: RankedEntity[];
  narrative: string | null;
  citations: Citation[];
  pagination: QueryPagination;
  intent: QueryIntent;
}

export interface Foundation {
  id: string;
  ein: string;
  name: string;
  description: string | null;
  totalAssets: number | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Nonprofit {
  id: string;
  ein: string | null;
  name: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Grant {
  id: string;
  filingId: string;
  foundationId: string;
  nonprofitId: string | null;
  amount: number | null;
  date: string | null;
  purposeText: string | null;
  filingYear: number;
  sourceRowHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Officer {
  id: string;
  foundationId: string;
  name: string;
  title: string | null;
  compensation: number | null;
  benefits: number | null;
  expenseAccount: number | null;
  filingYear: number;
  createdAt: string;
  updatedAt: string;
}

export interface Financials {
  id: string;
  foundationId: string;
  filingYear: number;
  totalRevenue: number | null;
  totalExpenses: number | null;
  totalAssets: number | null;
  netAssets: number | null;
  minimumInvestmentReturn: number | null;
  distributableAmount: number | null;
  qualifyingDistributions: number | null;
  undistributedIncome: number | null;
  excessDistributions: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Filing {
  id: string;
  foundationId: string;
  filingYear: number;
  ein: string;
  formType: string | null;
  taxPeriod: string | null;
  returnTimestamp: string | null;
  objectId: string | null;
  rawFiling: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionRunStatus {
  id: string;
  sourceKey: string;
  sourceType: string;
  status: string;
  inputPath: string | null;
  startedAt: string;
  completedAt: string | null;
  itemsDiscovered: number;
  filesProcessed: number;
  filesFailed: number;
  foundationsUpserted: number;
  nonprofitsUpserted: number;
  grantsUpserted: number;
  officersUpserted: number;
  financialsUpserted: number;
  progressPercent: number;
  errorMessage: string | null;
}
