import { envVars } from "@/utilities/enviromentVars";

/**
 * Connections-management API client for gap-oauth.
 *
 * gap-oauth lives at NEXT_PUBLIC_GAP_OAUTH_URL and exposes:
 *   GET    /me/connections           — list active grants for the user
 *   DELETE /me/connections/:clientId — revoke grant + cascade tokens
 *
 * Both endpoints authenticate with the user's Privy session JWT in
 * `Authorization: Bearer <token>`. We pass `getPrivyJwt` in instead of
 * importing useAuth — keeping this module a plain service (no React)
 * lets it be tested without RTL plumbing.
 */

export interface OAuthConnection {
  clientId: string;
  clientName: string;
  logoUri: string | null;
  clientUri: string | null;
  scope: string;
  // ISO timestamps from gap-oauth. `issuedAt` is the Grant's `iat` —
  // when the user originally clicked Allow. `expiresAt` is when the
  // Grant TTL elapses (30 days unless rotated).
  issuedAt: string | null;
  expiresAt: string | null;
  grantId: string;
}

interface ListConnectionsResponse {
  connections: OAuthConnection[];
}

export type GetPrivyJwt = () => Promise<string | null>;

class OAuthConnectionsError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "OAuthConnectionsError";
  }
}

async function authedFetch(
  path: string,
  init: RequestInit,
  getPrivyJwt: GetPrivyJwt
): Promise<Response> {
  const token = await getPrivyJwt();
  if (!token) {
    throw new OAuthConnectionsError("Not signed in. Refresh and try again.", 401);
  }
  const url = `${envVars.NEXT_PUBLIC_GAP_OAUTH_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}

export async function listConnections(getPrivyJwt: GetPrivyJwt): Promise<OAuthConnection[]> {
  const response = await authedFetch("/me/connections", { method: "GET" }, getPrivyJwt);
  if (!response.ok) {
    throw new OAuthConnectionsError(
      `Failed to load connections (${response.status})`,
      response.status
    );
  }
  const body = (await response.json()) as ListConnectionsResponse;
  return body.connections;
}

export async function revokeConnection(clientId: string, getPrivyJwt: GetPrivyJwt): Promise<void> {
  const response = await authedFetch(
    `/me/connections/${encodeURIComponent(clientId)}`,
    { method: "DELETE" },
    getPrivyJwt
  );
  if (response.status === 204) return;
  if (!response.ok) {
    throw new OAuthConnectionsError(
      `Failed to revoke connection (${response.status})`,
      response.status
    );
  }
}

export { OAuthConnectionsError };
