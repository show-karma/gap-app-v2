import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

export interface OAuthConnection {
  clientId: string;
  clientName: string;
  logoUri: string | null;
  clientUri: string | null;
  scope: string;
  grantedAt: string;
  lastUsedAt: string | null;
}

interface ListConnectionsResponse {
  consents: OAuthConnection[];
}

const apiClient = () => createAuthenticatedApiClient();

export async function listConnections(): Promise<OAuthConnection[]> {
  const response = await apiClient().get<ListConnectionsResponse>("/v2/oauth/consents");
  return response.data.consents;
}

export async function revokeConnection(clientId: string): Promise<void> {
  await apiClient().delete(`/v2/oauth/consents/${encodeURIComponent(clientId)}`);
}
