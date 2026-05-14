import type { NextRequest } from "next/server";
import { TEAM_ROLES, type TeamRole } from "@/lib/hermes-client";
import { envVars } from "@/utilities/enviromentVars";

// Streaming chat route. The browser calls this endpoint, which:
//   1. Authenticates the user via the indexer (forwards the bearer token).
//   2. Resolves the org's Hermes container URL + session token via the
//      indexer (single source of truth for tenant routing).
//   3. Opens a session against Hermes /api/sessions, posts the user
//      message, and streams the response back as Server-Sent Events.
//
// SSE was chosen over WS because:
//   - Next.js does not host long-lived WS server-side in App Router.
//   - The product surface ("send message → get streamed reply") fits SSE.
//   - Hermes itself exposes a JSON-RPC WS, but routing a browser → indexer
//     → container WS through Next would require a separate Node listener.
//     SSE keeps the hot path inside Next.
//
// This is the seam. The actual streaming implementation lands next; for
// now this handler validates inputs and returns a clear "not yet
// implemented" response so the chat tab can wire its UX without breaking.

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string; role: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { slug, role } = await ctx.params;

  if (!TEAM_ROLES.includes(role as TeamRole)) {
    return Response.json({ error: "Unknown team role" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  // Phase 1: scaffolded but not yet wired. Returns 501 so callers can detect
  // the seam. Phase 1.5 will:
  //   1. Resolve container URL + token via gap-indexer
  //      (GET /v2/hermes/orgs/:slug — already exists).
  //   2. POST to <container>/api/sessions/{id}/messages with the
  //      X-Hermes-Session-Token header.
  //   3. Stream the response body chunks back as SSE events.
  void envVars;
  return Response.json(
    {
      error: "Chat streaming not yet implemented",
      hint: `The seam is in place at /api/team/${slug}/${role}/chat. UI ships next.`,
    },
    { status: 501 }
  );
}
