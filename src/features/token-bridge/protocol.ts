/**
 * The token bridge's postMessage protocol.
 *
 * Shared contract with the embedding site (filpgf.io keeps its copy in
 * `src/data/site.ts`): change both ends together.
 *
 * Three messages, all plain objects so they survive structured cloning:
 *
 * - site → bridge `request`: "hand me a token". Carries an id the site chose,
 *   so it can match the answer to the question when several are in flight.
 * - bridge → site `response`: the token, or null when nobody is signed in or
 *   the refresh failed. Never an error — the site has one fallback either
 *   way, which is to ask as a visitor.
 * - bridge → site `ready`: sent once Privy has rehydrated, and again whenever
 *   the signed-in state flips. Lets the site choose its wording before it has
 *   asked for anything.
 */

export const TOKEN_BRIDGE_MESSAGE = {
  request: "karma-token-bridge:request",
  response: "karma-token-bridge:response",
  ready: "karma-token-bridge:ready",
} as const;

export interface TokenBridgeRequest {
  type: typeof TOKEN_BRIDGE_MESSAGE.request;
  id: string;
}

export interface TokenBridgeResponse {
  type: typeof TOKEN_BRIDGE_MESSAGE.response;
  id: string;
  token: string | null;
}

export interface TokenBridgeReady {
  type: typeof TOKEN_BRIDGE_MESSAGE.ready;
  authenticated: boolean;
}

/** Narrow an incoming `MessageEvent.data` to a well-formed request. */
export function isTokenBridgeRequest(data: unknown): data is TokenBridgeRequest {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    candidate.type === TOKEN_BRIDGE_MESSAGE.request &&
    typeof candidate.id === "string" &&
    candidate.id.length > 0
  );
}
