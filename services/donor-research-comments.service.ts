import {
  type CreateCommentRequest,
  IdempotencyCollisionError,
  IdentityRequiredError,
  RateLimitedError,
  type SharedReportComment,
  type SharedReportCommentNode,
  type SharedReportCommentsResponse,
} from "@/types/donor-research-comments";
import { TokenManager } from "@/utilities/auth/token-manager";

/**
 * Returns a `{ Authorization: "Bearer <Privy JWT>" }` header when a
 * Privy session is available, otherwise an empty object. Donors viewing
 * the shared report anonymously have no Privy session — the proxy +
 * indexer treat that as the anonymous path. The authenticated advisor
 * viewing their own report carries the JWT so the indexer's
 * `optionalAuthentication` + advisor branch can stamp `is_advisor=true`
 * (KTD13 + KTD14).
 */
async function maybeAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await TokenManager.getToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // TokenManager throws when Privy isn't initialized yet — treat as
    // anonymous rather than failing the comment post.
  }
  return {};
}

/**
 * Calls the Next.js API-route proxy on the FE origin. The proxy
 * forwards to the indexer server-to-server and translates cookies.
 */

function proxyUrl(token: string): string {
  return `/api/donor-research/shared/${encodeURIComponent(token)}/comments`;
}

function clearIdentityUrl(token: string): string {
  return `/api/donor-research/shared/${encodeURIComponent(token)}/clear-identity`;
}

export async function listSharedReportComments(
  token: string,
  params: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<SharedReportCommentsResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  const url = `${proxyUrl(token)}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const auth = await maybeAuthHeader();
  const res = await fetch(url, {
    method: "GET",
    credentials: "same-origin",
    headers: auth,
    signal,
  });
  if (!res.ok) {
    throw new Error(`listSharedReportComments failed: ${res.status}`);
  }
  return (await res.json()) as SharedReportCommentsResponse;
}

export async function postSharedReportComment(
  token: string,
  body: CreateCommentRequest,
  idempotencyKey: string
): Promise<SharedReportComment> {
  const auth = await maybeAuthHeader();
  const res = await fetch(proxyUrl(token), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      ...auth,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    if (data?.requiresIdentity) throw new IdentityRequiredError();
    throw new Error("Bad request");
  }
  if (res.status === 409) {
    throw new IdempotencyCollisionError();
  }
  if (res.status === 429) {
    // Guard against a missing / non-numeric Retry-After (e.g. an HTTP-date
    // form or absent header) so we never surface "try again in NaNs".
    const parsed = Number(res.headers.get("Retry-After"));
    throw new RateLimitedError(Number.isFinite(parsed) && parsed > 0 ? parsed : 60);
  }
  if (!res.ok) {
    throw new Error(`postSharedReportComment failed: ${res.status}`);
  }
  return (await res.json()) as SharedReportComment;
}

export async function clearCommenterIdentity(token: string): Promise<void> {
  const res = await fetch(clearIdentityUrl(token), {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error(`clearCommenterIdentity failed: ${res.status}`);
  }
}

/**
 * Assembles a depth-N comment tree from a flat list of roots + replies.
 * Replies whose parent is missing (e.g., parent soft-deleted upstream)
 * are dropped silently; the orphan-text-range lane handles missing
 * anchors but missing parent rows are a backend invariant violation.
 */
export function assembleCommentTree(
  roots: SharedReportComment[],
  replies: SharedReportComment[]
): SharedReportCommentNode[] {
  const byId = new Map<string, SharedReportCommentNode>();
  const rootNodes: SharedReportCommentNode[] = [];

  for (const r of roots) {
    const node: SharedReportCommentNode = { ...r, children: [] };
    byId.set(node.id, node);
    rootNodes.push(node);
  }

  for (const reply of replies) {
    if (!reply.parentCommentId) continue;
    const node: SharedReportCommentNode = { ...reply, children: [] };
    byId.set(node.id, node);
  }

  for (const reply of replies) {
    if (!reply.parentCommentId) continue;
    const child = byId.get(reply.id);
    const parent = byId.get(reply.parentCommentId);
    if (!child || !parent) continue;
    parent.children.push(child);
  }

  return rootNodes;
}
