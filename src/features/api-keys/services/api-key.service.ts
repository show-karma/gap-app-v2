import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import type { CreateApiKeyResponse, GetApiKeyResponse } from "../types/api-key";

// Mirrors types/api-key.ts (ApiKeyInfo / GetApiKeyResponse / CreateApiKeyResponse).
const ApiKeyInfoSchema = z
  .object({
    keyHint: z.string(),
    name: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    lastUsedAt: z.string().nullable(),
  })
  .passthrough();

const GetApiKeyResponseSchema = z
  .object({
    apiKey: ApiKeyInfoSchema.nullable(),
  })
  .passthrough();

const CreateApiKeyResponseSchema = z
  .object({
    key: z.string(),
    keyHint: z.string(),
    name: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

export const apiKeyService = {
  async get(): Promise<GetApiKeyResponse> {
    return api.get<GetApiKeyResponse>(INDEXER.API_KEYS.GET, {
      schema: GetApiKeyResponseSchema,
    });
  },

  async create(name?: string): Promise<CreateApiKeyResponse> {
    return api.post<CreateApiKeyResponse>(INDEXER.API_KEYS.CREATE, name ? { name } : {}, {
      schema: CreateApiKeyResponseSchema,
    });
  },

  async revoke(): Promise<void> {
    await api.delete(INDEXER.API_KEYS.REVOKE);
  },
};
