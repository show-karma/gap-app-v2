import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Client for the `pending_agent_writes` dashboard-approval surface.
 *
 * MCP agents (over OAuth) can *propose* critical funding-platform writes; those
 * are staged server-side and the human owner approves/rejects them here. This
 * is the FE half of the binding wire contract — field names below are EXACT and
 * every schema is loose (unknown keys preserved) so the backend may add fields
 * without breaking the client, but must never rename or remove these.
 *
 * See: mcp-writes PRD §4.4 / FR-18–20, and the wire contract doc.
 */

export const PENDING_AGENT_WRITE_STATUSES = [
  "pending",
  "approved",
  "executed",
  "rejected",
  "expired",
  "failed",
] as const;

export type PendingAgentWriteStatus = (typeof PENDING_AGENT_WRITE_STATUSES)[number];

/** Queue view. `decided` = executed | rejected | failed | expired. */
export type PendingAgentWritesStatusFilter = "pending" | "decided" | "all";

// `z.looseObject` is the Zod 4 equivalent of `z.object(...).passthrough()`: it
// keeps unknown keys so the backend can add fields without breaking the client,
// but must never rename or remove the ones declared here.
const ResultSchema = z.looseObject({
  statusCode: z.number(),
  error: z.string().nullable(),
});

const PendingAgentWriteSchema = z.looseObject({
  id: z.string(),
  summary: z.string(),
  label: z.string(),
  method: z.string(),
  path: z.string(),
  // The exact request body to be executed on approval. Kept as `unknown` so a
  // non-object payload from the backend can never fail-crash the whole list;
  // it is only ever rendered as pretty-printed JSON for the human reviewer.
  body: z.unknown().nullable(),
  status: z.enum(PENDING_AGENT_WRITE_STATUSES),
  clientName: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
  decidedAt: z.string().nullable(),
  result: ResultSchema.nullable(),
});

export type PendingAgentWrite = z.infer<typeof PendingAgentWriteSchema>;

const ListResponseSchema = z.looseObject({
  writes: z.array(PendingAgentWriteSchema),
  total: z.number(),
});

export type PendingAgentWritesList = z.infer<typeof ListResponseSchema>;

const ApproveResponseSchema = z.looseObject({
  id: z.string(),
  status: z.enum(PENDING_AGENT_WRITE_STATUSES),
  result: ResultSchema.nullable().optional(),
});

type ApproveAgentWriteResponse = z.infer<typeof ApproveResponseSchema>;

const RejectResponseSchema = z.looseObject({
  id: z.string(),
  status: z.enum(PENDING_AGENT_WRITE_STATUSES),
});

type RejectAgentWriteResponse = z.infer<typeof RejectResponseSchema>;

export const pendingAgentWritesService = {
  /** The caller's own queue for a given status filter (default `pending`). */
  list: (status: PendingAgentWritesStatusFilter = "pending"): Promise<PendingAgentWritesList> =>
    api.get<PendingAgentWritesList>(INDEXER.V2.PENDING_AGENT_WRITES.LIST(status), {
      schema: ListResponseSchema,
    }),

  /**
   * Approve a staged write — executes the STORED request server-side. Naturally
   * idempotent (status-guarded on the backend); a second approve returns 409.
   */
  approve: (id: string, idempotencyKey: string = uuidv4()): Promise<ApproveAgentWriteResponse> =>
    api.post<ApproveAgentWriteResponse>(INDEXER.V2.PENDING_AGENT_WRITES.APPROVE(id), undefined, {
      schema: ApproveResponseSchema,
      idempotencyKey,
    }),

  /** Reject a staged write — pending → rejected. Same 409 semantics as approve. */
  reject: (id: string, idempotencyKey: string = uuidv4()): Promise<RejectAgentWriteResponse> =>
    api.post<RejectAgentWriteResponse>(INDEXER.V2.PENDING_AGENT_WRITES.REJECT(id), undefined, {
      schema: RejectResponseSchema,
      idempotencyKey,
    }),
};
