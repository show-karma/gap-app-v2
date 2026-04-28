import type {
  CreateKnowledgeSourceInput,
  KnowledgeSource,
  UpdateKnowledgeSourceInput,
} from "@/types/v2/knowledge-base";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface ListSourcesResponse {
  data: KnowledgeSource[];
}

interface SingleSourceResponse {
  data: KnowledgeSource;
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
  const [data, error] = await fetchData<ListSourcesResponse>(
    INDEXER.KNOWLEDGE_BASE.LIST_SOURCES(communityIdOrSlug),
    "GET",
    undefined,
    {},
    {},
    true
  );
  if (error) throw new Error(error);
  return data?.data ?? [];
}

export async function createKnowledgeSource(
  communityIdOrSlug: string,
  input: CreateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  const [data, error] = await fetchData<SingleSourceResponse>(
    INDEXER.KNOWLEDGE_BASE.CREATE_SOURCE(communityIdOrSlug),
    "POST",
    input,
    {},
    {},
    true
  );
  if (error) throw new Error(error);
  if (!data?.data) throw new Error("Empty response from server");
  return data.data;
}

export async function updateKnowledgeSource(
  communityIdOrSlug: string,
  sourceId: string,
  patch: UpdateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  const [data, error] = await fetchData<SingleSourceResponse>(
    INDEXER.KNOWLEDGE_BASE.UPDATE_SOURCE(communityIdOrSlug, sourceId),
    "PATCH",
    patch,
    {},
    {},
    true
  );
  if (error) throw new Error(error);
  if (!data?.data) throw new Error("Empty response from server");
  return data.data;
}

export async function deleteKnowledgeSource(
  communityIdOrSlug: string,
  sourceId: string
): Promise<void> {
  const [, error] = await fetchData(
    INDEXER.KNOWLEDGE_BASE.DELETE_SOURCE(communityIdOrSlug, sourceId),
    "DELETE",
    undefined,
    {},
    {},
    true
  );
  if (error) throw new Error(error);
}

export async function triggerKnowledgeSourceResync(
  communityIdOrSlug: string,
  sourceId: string
): Promise<void> {
  const [, error] = await fetchData(
    INDEXER.KNOWLEDGE_BASE.RESYNC_SOURCE(communityIdOrSlug, sourceId),
    "POST",
    {},
    {},
    {},
    true
  );
  if (error) throw new Error(error);
}
