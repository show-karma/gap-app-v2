export interface ApiKeyInfo {
  keyHint: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyResponse {
  key: string;
  keyHint: string;
  name: string;
  createdAt: string;
}

export interface GetApiKeyResponse {
  apiKey: ApiKeyInfo | null;
}
