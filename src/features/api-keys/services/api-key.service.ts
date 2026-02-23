import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { CreateApiKeyResponse, GetApiKeyResponse } from "../types/api-key";

export const apiKeyService = {
  async get(): Promise<GetApiKeyResponse> {
    const [response, error] = await fetchData<GetApiKeyResponse>(INDEXER.API_KEYS.GET, "GET");
    if (error) throw new Error(error);
    return response!;
  },

  async create(name?: string): Promise<CreateApiKeyResponse> {
    const [response, error] = await fetchData<CreateApiKeyResponse>(
      INDEXER.API_KEYS.CREATE,
      "POST",
      name ? { name } : {}
    );
    if (error) throw new Error(error);
    return response!;
  },

  async revoke(): Promise<void> {
    const [, error] = await fetchData(INDEXER.API_KEYS.REVOKE, "DELETE");
    if (error) throw new Error(error);
  },
};
