import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const PhilanthropyEntityTypeSchema = z.enum(["foundation", "nonprofit", "grant"]);
export type PhilanthropyEntityType = z.infer<typeof PhilanthropyEntityTypeSchema>;

// ── Shared primitives ────────────────────────────────────────────────────────

export const CitationSchema = z.object({
  entityId: z.string(),
  entityType: PhilanthropyEntityTypeSchema,
  filingYear: z.number(),
  fieldPath: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

const EntityScoresSchema = z.object({
  semantic: z.number(),
  amount: z.number(),
  recency: z.number(),
  composite: z.number(),
});
type EntityScores = z.infer<typeof EntityScoresSchema>;

// ── Query / search ───────────────────────────────────────────────────────────

export const RankedEntitySchema = z.object({
  entityType: PhilanthropyEntityTypeSchema,
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  ein: z.string().nullable(),
  location: z.string().nullable(),
  totalAssets: z.number().nullable(),
  amount: z.number().nullable(),
  date: z.string().nullable(),
  filingYear: z.number().nullable(),
  foundationId: z.string().nullable(),
  foundationName: z.string().nullish(),
  nonprofitId: z.string().nullable(),
  nonprofitName: z.string().nullish(),
  scores: EntityScoresSchema,
});
export type RankedEntity = z.infer<typeof RankedEntitySchema>;

export const QueryIntentSchema = z.object({
  type: z.string(),
  targetEntityType: PhilanthropyEntityTypeSchema,
  referenceEntityName: z.string().nullable(),
  weights: z.object({
    semantic: z.number(),
    amount: z.number(),
    recency: z.number(),
  }),
});
export type QueryIntent = z.infer<typeof QueryIntentSchema>;

export const QueryPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  returned: z.number(),
  totalCount: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});
export type QueryPagination = z.infer<typeof QueryPaginationSchema>;

export const QueryResponseSchema = z.object({
  entities: z.array(RankedEntitySchema),
  narrative: z.string().nullable(),
  citations: z.array(CitationSchema),
  pagination: QueryPaginationSchema,
  intent: QueryIntentSchema,
  traceId: z.string().nullable(),
});
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

// ── Entity detail schemas ────────────────────────────────────────────────────

const FoundationSchema = z.object({
  id: z.string(),
  ein: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  totalAssets: z.number().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Foundation = z.infer<typeof FoundationSchema>;

const NonprofitSchema = z.object({
  id: z.string(),
  ein: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Nonprofit = z.infer<typeof NonprofitSchema>;

const GrantSchema = z.object({
  id: z.string(),
  filingId: z.string(),
  foundationId: z.string(),
  nonprofitId: z.string().nullable(),
  recipientName: z.string().nullable().optional(),
  amount: z.number().nullable(),
  date: z.string().nullable(),
  purposeText: z.string().nullable(),
  filingYear: z.number(),
  sourceRowHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Grant = z.infer<typeof GrantSchema>;

const OfficerSchema = z.object({
  id: z.string(),
  foundationId: z.string(),
  name: z.string(),
  title: z.string().nullable(),
  compensation: z.number().nullable(),
  benefits: z.number().nullable(),
  expenseAccount: z.number().nullable(),
  filingYear: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Officer = z.infer<typeof OfficerSchema>;

const FinancialsSchema = z.object({
  id: z.string(),
  foundationId: z.string(),
  filingYear: z.number(),
  totalRevenue: z.number().nullable(),
  totalExpenses: z.number().nullable(),
  totalAssets: z.number().nullable(),
  netAssets: z.number().nullable(),
  minimumInvestmentReturn: z.number().nullable(),
  distributableAmount: z.number().nullable(),
  qualifyingDistributions: z.number().nullable(),
  undistributedIncome: z.number().nullable(),
  excessDistributions: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Financials = z.infer<typeof FinancialsSchema>;

const FilingSchema = z.object({
  id: z.string(),
  foundationId: z.string(),
  filingYear: z.number(),
  ein: z.string(),
  formType: z.string().nullable(),
  taxPeriod: z.string().nullable(),
  returnTimestamp: z.string().nullable(),
  objectId: z.string().nullable(),
  rawFiling: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Filing = z.infer<typeof FilingSchema>;
