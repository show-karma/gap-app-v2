/**
 * Unit tests for non-profits/lib/agentic-philanthropy.ts
 *
 * Coverage targets:
 * - agenticResponseToQueryResponse mapping (entities, narrative, pagination)
 * - Entity type filtering
 * - Sort modes
 * - AgentAttachmentSchema validation
 * - AgenticQueryResponseSchema back-compat (no attachments field)
 */
import { describe, expect, it } from "vitest";
import {
  AgentAttachmentSchema,
  type AgenticQueryResponse,
  AgenticQueryResponseSchema,
  agenticResponseToQueryResponse,
} from "../lib/agentic-philanthropy";

const BASE_RESPONSE: AgenticQueryResponse = {
  answer: "The foundation made a grant.",
  summary: "Found one transaction.",
  plan: null,
  evidence: [],
  citations: [],
  traceId: "8be5cf1b-347b-48ea-8808-9dc5090a3f25",
  execution: {
    toolCalls: 1,
    durationMs: 10,
    partial: false,
    stoppedReason: null,
  },
  entities: [],
  assumptions: {},
};

describe("agenticResponseToQueryResponse", () => {
  it("maps agent organization and transaction evidence into ranked entities", () => {
    const result = agenticResponseToQueryResponse(
      {
        ...BASE_RESPONSE,
        evidence: [
          {
            id: "organization:f1",
            type: "organization",
            sourceId: "f1",
            stepId: "resolve",
            alias: "foundation",
            tool: "get_organization_by_id",
            summary: "Organization: Test Foundation",
            data: {
              id: "f1",
              name: "Test Foundation",
              kind: "private_foundation",
              ein: "12-3456789",
              totalAssets: 1_000_000,
            },
          },
          {
            id: "transaction:g1",
            type: "transaction",
            sourceId: "g1",
            stepId: "grants",
            alias: "grant",
            tool: "search_grants",
            data: {
              id: "g1",
              grantorId: "f1",
              grantorName: "Test Foundation",
              recipientId: "n1",
              recipientName: "Test Nonprofit",
              amount: 50_000,
              actionDate: "2024-01-01",
              filingYear: 2024,
              description: "Education grant",
            },
          },
        ],
      },
      { page: 1, limit: 50, sort: "amount-desc" }
    );

    expect(result.narrative).toBe("The foundation made a grant.");
    expect(result.traceId).toBe("8be5cf1b-347b-48ea-8808-9dc5090a3f25");
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toMatchObject({
      entityType: "grant",
      id: "g1",
      amount: 50_000,
      foundationId: "f1",
      nonprofitId: "n1",
    });
    expect(result.entities[1]).toMatchObject({
      entityType: "foundation",
      id: "f1",
      totalAssets: 1_000_000,
    });
    expect(result.pagination).toMatchObject({
      returned: 2,
      totalCount: 2,
      hasNextPage: false,
    });
  });

  it("applies entity type filters on mapped evidence", () => {
    const result = agenticResponseToQueryResponse(
      {
        ...BASE_RESPONSE,
        evidence: [
          {
            id: "organization:n1",
            type: "organization",
            sourceId: "n1",
            stepId: "search",
            alias: "nonprofit",
            tool: "search_organizations",
            data: {
              id: "n1",
              name: "Test Nonprofit",
              kind: "nonprofit",
            },
          },
        ],
      },
      { page: 1, limit: 50, entityTypes: ["foundation"] }
    );

    expect(result.entities).toEqual([]);
    expect(result.pagination.totalCount).toBe(0);
  });

  it("maps foundation grant ranking totals to displayed amount", () => {
    const result = agenticResponseToQueryResponse(
      {
        ...BASE_RESPONSE,
        evidence: [
          {
            id: "organization:f1",
            type: "organization",
            sourceId: "f1",
            stepId: "rank",
            alias: "foundation",
            tool: "rank_foundations_by_grants_paid",
            data: {
              id: "f1",
              name: "Largest Foundation",
              kind: "private_foundation",
              totalGrantAmount: 250_000,
              grantCount: 12,
            },
          },
          {
            id: "organization:f2",
            type: "organization",
            sourceId: "f2",
            stepId: "rank",
            alias: "foundation",
            tool: "rank_foundations_by_grants_paid",
            data: {
              id: "f2",
              name: "Smaller Foundation",
              kind: "private_foundation",
              totalGrantAmount: 100_000,
              grantCount: 5,
            },
          },
        ],
      },
      { page: 1, limit: 50, sort: "assets-desc" }
    );

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toMatchObject({
      entityType: "foundation",
      id: "f1",
      amount: 250_000,
      totalAssets: null,
    });
    expect(result.entities[1]).toMatchObject({
      entityType: "foundation",
      id: "f2",
      amount: 100_000,
      totalAssets: null,
    });
  });

  it("returns answer over summary for narrative", () => {
    const result = agenticResponseToQueryResponse(
      { ...BASE_RESPONSE, answer: "Primary answer", summary: "Fallback summary" },
      { page: 1, limit: 50 }
    );
    expect(result.narrative).toBe("Primary answer");
  });

  it("falls back to summary when answer is null", () => {
    const result = agenticResponseToQueryResponse(
      { ...BASE_RESPONSE, answer: null, summary: "Fallback summary" },
      { page: 1, limit: 50 }
    );
    expect(result.narrative).toBe("Fallback summary");
  });

  it("deduplicates entities from both entities[] and evidence[]", () => {
    const entityPayload = {
      entityType: "foundation",
      id: "f1",
      name: "Shared Foundation",
      description: null,
      ein: null,
      location: null,
      totalAssets: 500_000,
      amount: null,
      date: null,
      filingYear: null,
      foundationId: "f1",
      foundationName: "Shared Foundation",
      nonprofitId: null,
      nonprofitName: null,
      scores: { semantic: 0, amount: 0, recency: 0, composite: 1 },
    };
    const result = agenticResponseToQueryResponse(
      {
        ...BASE_RESPONSE,
        entities: [entityPayload],
        evidence: [
          {
            id: "organization:f1",
            type: "organization",
            sourceId: "f1",
            stepId: "resolve",
            alias: "foundation",
            tool: "get_org",
            data: { id: "f1", name: "Shared Foundation", kind: "private_foundation" },
          },
        ],
      },
      { page: 1, limit: 50 }
    );
    // evidence entry wins (last write), but there should only be ONE entity for f1
    expect(result.entities.filter((e) => e.id === "f1")).toHaveLength(1);
  });

  it("sorts by recency when sort=recency", () => {
    const result = agenticResponseToQueryResponse(
      {
        ...BASE_RESPONSE,
        evidence: [
          {
            id: "transaction:g1",
            type: "transaction",
            sourceId: "g1",
            stepId: "s",
            alias: "grant",
            tool: "t",
            data: { id: "g1", amount: 100, actionDate: "2022-01-01" },
          },
          {
            id: "transaction:g2",
            type: "transaction",
            sourceId: "g2",
            stepId: "s",
            alias: "grant",
            tool: "t",
            data: { id: "g2", amount: 50, actionDate: "2024-06-01" },
          },
        ],
      },
      { page: 1, limit: 50, sort: "recency" }
    );

    expect(result.entities[0].id).toBe("g2"); // newer first
    expect(result.entities[1].id).toBe("g1");
  });

  it("hasPreviousPage is true when page > 1", () => {
    const result = agenticResponseToQueryResponse(BASE_RESPONSE, { page: 2, limit: 50 });
    expect(result.pagination.hasPreviousPage).toBe(true);
  });
});

describe("AgentAttachmentSchema", () => {
  it("parses a valid attachment payload", () => {
    const result = AgentAttachmentSchema.safeParse({
      handle: "att_1",
      filename: "macarthur-2024.csv",
      contentType: "text/csv; charset=utf-8",
      base64: "aGVsbG8=",
      rowCount: 42,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative rowCount", () => {
    const result = AgentAttachmentSchema.safeParse({
      handle: "att_1",
      filename: "x.csv",
      contentType: "text/csv",
      base64: "aGVsbG8=",
      rowCount: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("AgenticQueryResponseSchema attachments", () => {
  it("accepts payloads without an attachments field for back-compat", () => {
    const { attachments: _attachments, ...withoutAttachments } = BASE_RESPONSE as Record<
      string,
      unknown
    >;
    const result = AgenticQueryResponseSchema.safeParse(withoutAttachments);
    expect(result.success).toBe(true);
  });

  it("parses attachments when the indexer surfaces them", () => {
    const result = AgenticQueryResponseSchema.safeParse({
      ...BASE_RESPONSE,
      attachments: [
        {
          handle: "att_1",
          filename: "grants.csv",
          contentType: "text/csv",
          base64: "Zm9v",
          rowCount: 7,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachments).toHaveLength(1);
      expect(result.data.attachments?.[0].handle).toBe("att_1");
    }
  });
});
