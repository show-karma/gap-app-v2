import { z } from "zod";
import type {
  CreateKnowledgeSourceInput,
  KnowledgeSource,
  UpdateKnowledgeSourceInput,
} from "@/types/v2/knowledge-base";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

// The nested `KnowledgeSource` shape is validated by its consumers today
// (fetchData applied zero runtime validation) — keep it untyped at the
// envelope level rather than inventing a stricter shape than reality.
const ListSourcesResponseSchema = z
  .object({
    data: z.array(z.unknown()),
  })
  .passthrough();

const SingleSourceResponseSchema = z
  .object({
    data: z.unknown(),
  })
  .passthrough();

/**
 * DEV-202: structured error thrown by the knowledge-base service so
 * callers can branch on HTTP status (e.g., 409 → duplicate externalId)
 * rather than text-matching the server message. The `api` client throws
 * a typed `HttpError` carrying the status; we preserve it on this class so
 * dialogs can handle the conflict path without parsing English copy.
 */
export class KnowledgeBaseApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "KnowledgeBaseApiError";
    this.status = status;
    // Restore the prototype chain in case this is constructed in a
    // bundled / down-leveled context where `super(...)` strips it.
    Object.setPrototypeOf(this, KnowledgeBaseApiError.prototype);
  }
}

/**
 * Knowledge-base API client. All hooks consume this module — the React
 * Query hooks supply caching/invalidation/optimistic-update plumbing,
 * the service supplies the network calls. Mirrors the convention used
 * by `services/communities.service.ts`, `services/project.service.ts`,
 * etc.
 *
 * Authorization: all endpoints are gated server-side to community
 * admins (and Karma staff). Non-admin callers receive 403 from the
 * controller's CommunityInfoService check; this service surfaces the
 * 403 as an Error with the server's message.
 */

export async function listKnowledgeSources(communityIdOrSlug: string): Promise<KnowledgeSource[]> {
  const data = await api.get<z.infer<typeof ListSourcesResponseSchema>>(
    INDEXER.KNOWLEDGE_BASE.LIST_SOURCES(communityIdOrSlug),
    { schema: ListSourcesResponseSchema }
  );
  return (data?.data ?? []) as KnowledgeSource[];
}

export async function createKnowledgeSource(
  communityIdOrSlug: string,
  input: CreateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  const data = await api.post<z.infer<typeof SingleSourceResponseSchema>>(
    INDEXER.KNOWLEDGE_BASE.CREATE_SOURCE(communityIdOrSlug),
    input,
    { schema: SingleSourceResponseSchema }
  );
  if (!data?.data) throw new Error("Empty response from server");
  return data.data as KnowledgeSource;
}

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic "HTTP <status> <method> <path>" message.
 */
function httpErrorMessage(error: HttpError): string {
  const bodyMessage = (error.body as { message?: string } | undefined)?.message;
  const causeMessage = (error.cause as { message?: string } | undefined)?.message;
  return bodyMessage || causeMessage || error.message;
}

export async function updateKnowledgeSource(
  communityIdOrSlug: string,
  sourceId: string,
  patch: UpdateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  // The status is preserved on the thrown KnowledgeBaseApiError so callers
  // (e.g., EditSourceDialog) can branch on 409 → duplicate externalId
  // without parsing the server's message.
  let data: z.infer<typeof SingleSourceResponseSchema>;
  try {
    data = await api.patch<z.infer<typeof SingleSourceResponseSchema>>(
      INDEXER.KNOWLEDGE_BASE.UPDATE_SOURCE(communityIdOrSlug, sourceId),
      patch,
      { schema: SingleSourceResponseSchema }
    );
  } catch (error) {
    if (isApiError(error) && error instanceof HttpError) {
      throw new KnowledgeBaseApiError(httpErrorMessage(error), error.status);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new KnowledgeBaseApiError(message, 500);
  }
  if (!data?.data) throw new Error("Empty response from server");
  return data.data as KnowledgeSource;
}

export async function deleteKnowledgeSource(
  communityIdOrSlug: string,
  sourceId: string
): Promise<void> {
  await api.delete(INDEXER.KNOWLEDGE_BASE.DELETE_SOURCE(communityIdOrSlug, sourceId));
}

export async function triggerKnowledgeSourceResync(
  communityIdOrSlug: string,
  sourceId: string
): Promise<void> {
  await api.post(INDEXER.KNOWLEDGE_BASE.RESYNC_SOURCE(communityIdOrSlug, sourceId), {});
}
