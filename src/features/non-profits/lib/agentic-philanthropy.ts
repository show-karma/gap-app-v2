/**
 * Agentic philanthropy response mapping — ported from
 * grant-atlas features/grant-atlas/lib/agentic-philanthropy.ts.
 *
 * Converts the raw SSE `final_answer` payload (AgenticQueryResponse) into
 * the canonical QueryResponse + RankedEntity shape used by the store and UI.
 */
import { z } from "zod";
import {
  type PhilanthropyEntityType,
  type QueryIntent,
  type QueryPagination,
  type QueryResponse,
  type RankedEntity,
  RankedEntitySchema,
} from "../types/philanthropy";

const AgentCitationSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  title: z.string().optional(),
  sourceUrl: z.string().optional(),
  excerpt: z.string().optional(),
});

const AgentEvidenceSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  sourceId: z.string().optional(),
  stepId: z.string(),
  alias: z.string(),
  tool: z.string(),
  summary: z.string().optional(),
  data: z.unknown().optional(),
  identifiers: z.record(z.string(), z.unknown()).optional(),
});

export const AgentAttachmentSchema = z.object({
  handle: z.string(),
  filename: z.string(),
  contentType: z.string(),
  base64: z.string(),
  rowCount: z.number().int().nonnegative(),
});

export type AgentAttachment = z.infer<typeof AgentAttachmentSchema>;

export const AgenticQueryResponseSchema = z.object({
  answer: z.string().nullable(),
  summary: z.string().nullable(),
  plan: z.unknown().nullable(),
  evidence: z.array(AgentEvidenceSchema),
  citations: z.array(AgentCitationSchema),
  traceId: z.string().nullable(),
  execution: z.object({
    toolCalls: z.number(),
    durationMs: z.number(),
    partial: z.boolean(),
    stoppedReason: z.string().nullable(),
  }),
  entities: z.array(z.unknown()),
  assumptions: z
    .object({
      dateBasis: z.string().nullable().optional(),
      matchedEntityIds: z.array(z.string()).optional(),
      matchedEntityNames: z.array(z.string()).optional(),
      relationshipExpansions: z.array(z.string()).optional(),
      aggregationMode: z.string().nullable().optional(),
    })
    .optional(),
  // Optional for back-compat with indexer revs predating the download-export feature.
  attachments: z.array(AgentAttachmentSchema).optional(),
});

export type AgenticQueryResponse = z.infer<typeof AgenticQueryResponseSchema>;

export type SearchSortKey =
  | "relevance"
  | "assets-desc"
  | "assets-asc"
  | "amount-desc"
  | "amount-asc"
  | "recency";

const DEFAULT_SCORES = {
  semantic: 0,
  amount: 0,
  recency: 0,
  composite: 1,
};

const DEFAULT_INTENT: QueryIntent = {
  type: "agentic",
  targetEntityType: "grant",
  referenceEntityName: null,
  weights: {
    semantic: 1,
    amount: 0,
    recency: 0,
  },
};

export function agenticResponseToQueryResponse(
  response: AgenticQueryResponse,
  options: {
    page: number;
    limit: number;
    sort?: SearchSortKey;
    entityTypes?: string[];
  }
): QueryResponse {
  const entities = sortEntities(
    filterEntities(agenticResponseToRankedEntities(response), options.entityTypes),
    options.sort
  );
  const pagination = buildPagination(options.page, options.limit, entities.length);

  return {
    entities,
    narrative: response.answer ?? response.summary,
    citations: [],
    pagination,
    intent: inferIntent(entities),
    traceId: response.traceId,
  };
}

function agenticResponseToRankedEntities(response: AgenticQueryResponse): RankedEntity[] {
  const byId = new Map<string, RankedEntity>();

  for (const entity of response.entities) {
    const parsed = RankedEntitySchema.safeParse(entity);
    if (parsed.success) {
      byId.set(`${parsed.data.entityType}:${parsed.data.id}`, parsed.data);
    }
  }

  for (const evidence of response.evidence) {
    const entity = evidenceToRankedEntity(evidence);
    if (entity) byId.set(`${entity.entityType}:${entity.id}`, entity);
  }

  return [...byId.values()];
}

function evidenceToRankedEntity(
  evidence: z.infer<typeof AgentEvidenceSchema>
): RankedEntity | null {
  const data = asRecord(evidence.data);
  if (!data) return null;

  if (evidence.type === "organization") {
    return organizationToRankedEntity(data, evidence.summary);
  }

  if (evidence.type === "transaction") {
    return transactionToRankedEntity(data);
  }

  return null;
}

function organizationToRankedEntity(
  data: Record<string, unknown>,
  summary?: string
): RankedEntity | null {
  const id = stringValue(data.id);
  if (!id) return null;

  const kind = stringValue(data.kind);
  const entityType: PhilanthropyEntityType =
    kind === "private_foundation" ? "foundation" : "nonprofit";
  const totalAssets = numberValue(data.totalAssets);
  const grantTotalAmount = numberValue(data.totalGrantAmount);

  return {
    entityType,
    id,
    name: stringValue(data.name) ?? null,
    description: summary ?? null,
    ein: stringValue(data.ein) ?? null,
    location: stringValue(data.location) ?? null,
    totalAssets,
    amount: grantTotalAmount,
    date: null,
    filingYear: null,
    foundationId: entityType === "foundation" ? id : null,
    foundationName: entityType === "foundation" ? (stringValue(data.name) ?? null) : null,
    nonprofitId: entityType === "nonprofit" ? id : null,
    nonprofitName: entityType === "nonprofit" ? (stringValue(data.name) ?? null) : null,
    scores: scoresFromSimilarity(data.similarity),
  };
}

function transactionToRankedEntity(data: Record<string, unknown>): RankedEntity | null {
  const id = stringValue(data.id);
  if (!id) return null;

  const recipientName = stringValue(data.recipientName);
  const grantorName = stringValue(data.grantorName);
  const description = stringValue(data.description);

  return {
    entityType: "grant",
    id,
    name: recipientName ?? description ?? id,
    description: description ?? null,
    ein: null,
    location: null,
    totalAssets: null,
    amount: numberValue(data.amount),
    date: stringValue(data.actionDate) ?? null,
    filingYear: numberValue(data.filingYear),
    foundationId: stringValue(data.grantorId) ?? null,
    foundationName: grantorName ?? null,
    nonprofitId: stringValue(data.recipientId) ?? null,
    nonprofitName: recipientName ?? null,
    scores: scoresFromSimilarity(data.similarity),
  };
}

function filterEntities(entities: RankedEntity[], entityTypes?: string[]): RankedEntity[] {
  if (!entityTypes || entityTypes.length === 0) return entities;
  const allowed = new Set(entityTypes);
  return entities.filter((entity) => allowed.has(entity.entityType));
}

function sortEntities(entities: RankedEntity[], sort: SearchSortKey | undefined): RankedEntity[] {
  const sorted = [...entities];
  switch (sort) {
    case "assets-desc":
      return sorted.sort((a, b) => displayMetric(b) - displayMetric(a));
    case "assets-asc":
      return sorted.sort((a, b) => displayMetric(a) - displayMetric(b));
    case "amount-desc":
      return sorted.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
    case "amount-asc":
      return sorted.sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
    case "recency":
      return sorted.sort((a, b) => dateTime(b.date) - dateTime(a.date));
    default:
      return sorted;
  }
}

function displayMetric(entity: RankedEntity): number {
  return entity.totalAssets ?? entity.amount ?? 0;
}

function buildPagination(page: number, limit: number, returned: number): QueryPagination {
  return {
    page,
    limit,
    returned,
    totalCount: returned,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  };
}

function inferIntent(entities: RankedEntity[]): QueryIntent {
  return {
    ...DEFAULT_INTENT,
    targetEntityType: entities[0]?.entityType ?? DEFAULT_INTENT.targetEntityType,
  };
}

function scoresFromSimilarity(value: unknown): RankedEntity["scores"] {
  const similarity = numberValue(value);
  if (similarity == null) return DEFAULT_SCORES;
  return {
    semantic: similarity,
    amount: 0,
    recency: 0,
    composite: similarity,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateTime(value: string | null): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}
